import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpDefaultAccountAddress,
} from "../../util";
import { ASTRO_TOKEN_ADDRESS, CHAIN_PREFIX } from "../../env";
import { MsgExecuteContract } from "@terra-money/feather.js";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const lunaAmount = (659_500).toString();
const astroAmount = (6_701_058).toString();

const withdraw = async () => {
  const warpAccountAddress = await getWarpDefaultAccountAddress(lcd, myAddress);
  const executeMsg = {
    generic: {
      msgs: [
        // withdraw native token
        {
          bank: {
            send: {
              amount: [{ denom: "uluna", amount: lunaAmount }],
              to_address: myAddress,
            },
          },
        },
        // // withdraw cw20
        // {
        //   wasm: {
        //     execute: {
        //       contract_addr: astroTokenAddress,
        //       msg: toBase64({
        //         transfer: {
        //           recipient: myAddress,
        //           amount: astroAmount,
        //         },
        //       }),
        //       funds: [],
        //     },
        //   },
        // },
      ],
    },
  };
  const contractSend = new MsgExecuteContract(myAddress, warpAccountAddress, executeMsg);

  createSignBroadcastCatch(wallet, [contractSend]);
};

withdraw();
