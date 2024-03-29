import Big from "big.js";
import { MsgExecuteContract } from "@terra-money/feather.js";
import {
  calculateWarpProtocolFeeForRecurringJob,
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  toBase64,
} from "../../../util";
import {
  ASTRO_LUNA_PAIR_ADDRESS,
  CHAIN_DENOM,
  CHAIN_PREFIX,
  WARP_CONTROLLER_ADDRESS,
} from "../../../env";
import { DEFAULT_JOB_REWARD } from "../../../constant";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const astroportAstroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const run = async () => {
  // default spread is 0.01 which is 1%
  // maybe i don't need to specify spread in swap msg, as condition already ensure i get the price i want
  const maxSpread = "0.01";

  const totalSwapAmount = (50_000).toString();

  const dcaNumber = (3).toString();

  // 86400 is 1 day in seconds
  // const dcaInterval = 60 * 60 * 24 * 7;
  // make it shorter for testing, 30 seconds
  const dcaInterval = (30).toString();
  // initial value is current timestamp
  const dcaStartTime = String(Math.floor(Date.now() / 1000));

  // start immediately
  const secondsToFirstExecute = 0;

  // round down to 3 decimal places to avoid running out of fund
  const singleSwapAmount = Big(totalSwapAmount).div(dcaNumber).round(3, 0).toString();

  const warpProtocolFee = await calculateWarpProtocolFeeForRecurringJob(
    secondsToFirstExecute,
    DEFAULT_JOB_REWARD,
    dcaInterval,
    dcaNumber
  );

  /// =========== var ===========

  const jobVarNameNextExecution = "dca_swap_luna_to_astro_next_execution";
  const jobVarNextExecution = {
    static: {
      kind: "uint", // NOTE: it's better to use uint instead of timestamp to keep it consistent with condition
      name: jobVarNameNextExecution,
      value: dcaStartTime,
      update_fn: {
        // update value to current timestamp + dcaInterval, i.e. make next execution 1 day later
        on_success: {
          uint: {
            expr: {
              left: {
                simple: dcaInterval,
              },
              op: "add",
              right: {
                env: "time",
              },
            },
          },
        },
        // on error, do nothing for now, this will stop creating new jobs
        // on_error: {
        // }
      },
      encode: false,
    },
  };

  const jobVarNameAlreadyRunCounter = "dca_already_run_counter";
  const jobVarAlreadyRunCounter = {
    static: {
      kind: "int",
      name: jobVarNameAlreadyRunCounter,
      value: (0).toString(), // initial counter value is 0
      update_fn: {
        // increment counter
        on_success: {
          int: {
            expr: {
              left: {
                ref: `$warp.variable.${jobVarNameAlreadyRunCounter}`,
              },
              op: "add",
              right: {
                simple: (1).toString(),
              },
            },
          },
        },
        // on error, do nothing for now, this will stop creating new jobs
        // on_error: {
        // }
      },
    },
  };

  /// =========== condition ===========

  const condition = {
    and: [
      {
        expr: {
          uint: {
            // NOTE: we must use uint instead of timestamp here as timestamp can only compare current time with var
            // there is no left side of expression
            left: {
              env: "time",
            },
            op: "gt",
            right: {
              ref: `$warp.variable.${jobVarNameNextExecution}`,
            },
          },
        },
      },
      {
        expr: {
          int: {
            left: {
              ref: `$warp.variable.${jobVarNameAlreadyRunCounter}`,
            },
            op: "lt",
            right: {
              simple: dcaNumber,
            },
          },
        },
      },
    ],
  };

  /// =========== job msgs ===========

  const astroportNativeSwapMsg = {
    swap: {
      offer_asset: {
        info: {
          native_token: {
            denom: CHAIN_DENOM,
          },
        },
        amount: singleSwapAmount,
      },
      /*
      Belief Price + Max Spread
      If belief_price is provided in combination with max_spread, 
      the pool will check the difference between the return amount (using belief_price) and the real pool price.
      The belief_price +/- the max_spread is the range of possible acceptable prices for this swap.
      */
      // belief_price: beliefPrice,
      // max_spread: '0.005',
      max_spread: maxSpread,
      // to: '...', // default to sender
      to: myAddress,
    },
  };
  const nativeSwap = {
    wasm: {
      execute: {
        contract_addr: astroportAstroLunaPairAddress,
        msg: toBase64(astroportNativeSwapMsg),
        funds: [{ denom: CHAIN_DENOM, amount: singleSwapAmount }],
      },
    },
  };

  /// =========== cosmos msgs ===========

  const createWarpAccountIfNotExistAndFundAccount = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    {
      create_account: {},
    },
    {
      uluna: Big(warpProtocolFee).add(Big(totalSwapAmount)).toString(),
    }
  );

  const createJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "astroport_dca_order_luna_to_astro_from_pool",
      description: "DCA order from Luna to Astro from Astroport Astro-Luna pool",
      labels: [],
      recurring: true,
      requeue_on_evict: true,
      reward: DEFAULT_JOB_REWARD,
      condition: condition,
      msgs: [JSON.stringify(nativeSwap)],
      vars: [jobVarNextExecution, jobVarAlreadyRunCounter],
    },
  });

  /// =========== sign and broadcast ===========

  createSignBroadcastCatch(wallet, [createWarpAccountIfNotExistAndFundAccount, createJob]);
};

run();
