import axios from "axios";
import { LCDClient, MnemonicKey, Msg, Wallet } from "@terra-money/feather.js";

import { CW20Addr, CW20Token, NativeToken, WarpSdk } from "@terra-money/warp-sdk";
import {
  CHAIN_DENOM,
  CHAIN_ID,
  CHAIN_PREFIX,
  IS_COIN_TYPE_118,
  LCD_ENDPOINT,
  TESTER1_MNEMONIC_KEY,
  TESTER2_MNEMONIC_KEY,
  TESTER3_MNEMONIC_KEY,
  DEFAULT_TESTER_ID,
  WARP_CONTROLLER_ADDRESS,
  ASTRO_TOKEN_ADDRESS,
} from "./env";
import Big from "big.js";
import { DAY_IN_SECONDS, DEFAULT_EVICTION_FEE, DEFAULT_JOB_REWARD } from "./constant";

export const getCurrentBlockHeight = async (lcd: LCDClient): Promise<string> => {
  return (await lcd.tendermint.blockInfo(CHAIN_ID)).block.header.height;
};

export const getLCD = (): LCDClient => {
  return new LCDClient({
    [CHAIN_ID]: {
      lcd: LCD_ENDPOINT,
      chainID: CHAIN_ID,
      gasAdjustment: 3.5,
      gasPrices: { [CHAIN_DENOM]: 0.015 },
      prefix: CHAIN_PREFIX, // bech32 prefix, used by the LCD to understand which is the right chain to query
    },
  });
};

export const getMnemonicKey = (testerId = DEFAULT_TESTER_ID): MnemonicKey => {
  switch (testerId) {
    case 1:
      return new MnemonicKey({
        mnemonic: TESTER1_MNEMONIC_KEY,
        coinType: IS_COIN_TYPE_118 ? 118 : 330,
      });
    case 2:
      return new MnemonicKey({
        mnemonic: TESTER2_MNEMONIC_KEY,
        coinType: IS_COIN_TYPE_118 ? 118 : 330,
      });
    case 3:
      return new MnemonicKey({
        mnemonic: TESTER3_MNEMONIC_KEY,
        coinType: IS_COIN_TYPE_118 ? 118 : 330,
      });
    default:
      return new MnemonicKey({
        mnemonic: TESTER1_MNEMONIC_KEY,
        coinType: IS_COIN_TYPE_118 ? 118 : 330,
      });
  }
};

export const getWallet = (lcd: LCDClient, mnemonicKey: MnemonicKey): Wallet => {
  return new Wallet(lcd, mnemonicKey);
};

export const initWarpSdk = (): WarpSdk => {
  const lcd = getLCD();
  return new WarpSdk(getWallet(lcd, getMnemonicKey()), lcd.config[CHAIN_ID]);
};

export const toBase64 = (obj: Object) => {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
};

// !!! stargate msg value is binary encoded unlike others that are json encoded
export const toBase64FromBinary = (b: Uint8Array) => {
  return Buffer.from(b).toString("base64");
};

// used for encoding wasm contract
export const toBase64FromBuffer = (b: Buffer) => {
  return b.toString("base64");
};

// if is axios error then print the extracted part otherwise print whole error
// most of time it should be cause axios error is the one returned when we call lcd
export const printAxiosError = (e: any) => {
  if (axios.isAxiosError(e)) {
    if (e.response) {
      console.log(e.response.status);
      console.log(e.response.headers);
      if (
        typeof e.response.data === "object" &&
        e.response.data !== null &&
        "code" in e.response.data &&
        "message" in e.response.data
      ) {
        console.log(`Code=${e.response?.data["code"]} Message=${e.response?.data["message"]} \n`);
      } else {
        console.log(e.response.data);
      }
    }
  } else {
    console.log(e);
  }
};

export const getWarpDefaultAccountAddress = async (
  lcd: LCDClient,
  owner: string
): Promise<string> => {
  const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;
  const warpAccount = await queryWasmContractWithCatch(lcd, warpControllerAddress, {
    query_account: {
      owner: owner,
    },
  });
  // @ts-ignore
  return warpAccount.account.account;
};

export const getWarpFirstFreeSubAccountAddress = async (
  lcd: LCDClient,
  owner: string
): Promise<string> => {
  const warpDefaultAccountAddress = await getWarpDefaultAccountAddress(lcd, owner);
  const warpFreeSubAccount = await queryWasmContractWithCatch(lcd, warpDefaultAccountAddress, {
    query_first_free_sub_account: {},
  });
  // @ts-ignore
  return warpFreeSubAccount.addr;
};

export const getWarpJobCreationFeePercentage = async (lcd: LCDClient): Promise<string> => {
  const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;
  const warpConfig = await queryWasmContractWithCatch(lcd, warpControllerAddress, {
    query_config: {},
  });
  // @ts-ignore
  return warpConfig.config.creation_fee_percentage;
};

export const calculateWarpProtocolFeeForOneTimeJob = async (
  expireInSeconds: number = 1,
  reward: string = DEFAULT_JOB_REWARD
): Promise<string> => {
  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(getLCD());
  const creationFee = Big(reward).mul(Big(warpCreationFeePercentages).div(100));
  // e.g. expireInDays = 2, then eviction fee is 50_000 cause if we don't pay eviction fee, then the job will be evicted after 1 day
  const evictionFee = Big(DEFAULT_EVICTION_FEE).mul(
    Math.max(1, Math.ceil(expireInSeconds / DAY_IN_SECONDS)) - 1
  );
  return Big(reward).add(creationFee).add(evictionFee).toString();
};

// e.g. using the default value, the job will be executed 3 times, first time is 1 day after creation, then run again every 2 days
export const calculateWarpProtocolFeeForRecurringJob = async (
  secondsToFirstExecute: number = 1,
  singleExecutionReward: string = DEFAULT_JOB_REWARD,
  recurringIntervalInSeconds: string = "15",
  totalRunCount: string = "3"
): Promise<string> => {
  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(getLCD());
  const creationFee = Big(singleExecutionReward)
    .mul(warpCreationFeePercentages)
    .div(100)
    .mul(totalRunCount);
  const evictionFee = Big(DEFAULT_EVICTION_FEE).mul(
    Math.max(1, Math.ceil(secondsToFirstExecute / DAY_IN_SECONDS)) -
      1 +
      (Math.max(1, Math.ceil(Number(recurringIntervalInSeconds) / DAY_IN_SECONDS)) - 1) *
        (Number(totalRunCount) - 1)
  );
  const totalReward = Big(singleExecutionReward).mul(totalRunCount);
  console.log(`totalReward=${totalReward} creationFee=${creationFee} evictionFee=${evictionFee}`);
  return Big(totalReward).add(creationFee).add(evictionFee).toString();
};

export const queryWasmContractWithCatch = async (
  lcd: LCDClient,
  contractAddress: string,
  query: object
) => {
  return lcd.wasm.contractQuery(contractAddress, query).catch((e) => {
    console.log(`error in querying contract ${contractAddress}`);
    printAxiosError(e);
    throw e;
  });
};

export const createSignBroadcastCatch = async (
  wallet: Wallet,
  msgs: Msg[],
  autoEstimateFee = true
) => {
  const txOptions = {
    msgs: msgs,
    chainID: CHAIN_ID,
  };
  if (!autoEstimateFee) {
    txOptions["gasPrices"] = "0.15uluna";
    txOptions["gasAdjustment"] = 1.4;
    txOptions["gas"] = (1_500_000).toString();
  }
  wallet
    .createAndSignTx(txOptions)
    .then((tx) => wallet.lcd.tx.broadcast(tx, CHAIN_ID))
    .catch((e) => {
      console.log("error in create and sign tx");
      printAxiosError(e);
      throw e;
    })
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      console.log("error in broadcast tx");
      printAxiosError(e);
      throw e;
    });
};

export const LUNA_TOKEN: NativeToken = {
  key: "luna",
  name: "Luna",
  symbol: "LUNA",
  icon: "",
  decimals: 6,
  type: "native",
  denom: "uluna",
};

export const ASTRO_TOKEN: CW20Token = {
  key: "astro",
  name: "Astro",
  symbol: "ASTRO",
  icon: "",
  decimals: 6,
  type: "cw20",
  protocol: "astroport",
  token: ASTRO_TOKEN_ADDRESS! as CW20Addr,
};
