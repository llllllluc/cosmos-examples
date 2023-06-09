import { warp_controller, LUNA } from "@terra-money/warp-sdk";
import {
  getLCDOld,
  getMnemonicKeyOld,
  getWalletOld,
  initWarpSdk,
  printAxiosError,
} from "../../util";

const mnemonicKey = getMnemonicKeyOld();
const lcd = getLCDOld();
const wallet = getWalletOld(lcd, mnemonicKey);
const warpSdk = initWarpSdk(lcd, wallet);

const run = async () => {
  const warpAccountAddress = await warpSdk
    .account(wallet.key.accAddress)
    .then((warp_account: warp_controller.Account) => {
      return warp_account.account;
    });

  const amount = (4_000_000).toString();

  warpSdk
    .depositToAccount(wallet.key.accAddress, warpAccountAddress, LUNA, amount)
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

run();
