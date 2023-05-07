import { Coins, MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet, printAxiosError } from '../util';
import {
  ASTROPORT_ROUTER_ADDRESS,
  ASTRO_LUNA_PAIR_ADDRESS,
  ASTRO_TOKEN_ADDRESS,
  CHAIN_DENOM,
  CHAIN_ID,
  CHAIN_PREFIX,
} from '../env';

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

// this is the astro-luna pair contract, not the astro-luna lp token contract
const astroportRouterAddress = ASTROPORT_ROUTER_ADDRESS!;

const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const astroAmount100 = 100_000_000;
const lunaAmount10 = 10_000_000;

const run = async () => {
  const swap = new MsgExecuteContract(
    myAddress,
    astroportRouterAddress,
    {
      execute_swap_operations: {
        max_spread: '0.5',
        // minimum_receive: '9500000000',
        // to: '...', // default to sender
        operations: [
          {
            astro_swap: {
              ask_asset_info: {
                token: {
                  contract_addr: astroTokenAddress,
                },
              },
              offer_asset_info: {
                native_token: {
                  denom: CHAIN_DENOM,
                },
              },
            },
          },
        ],
      },
    },
    new Coins({ [CHAIN_DENOM]: lunaAmount10.toString() })
  );

  wallet
    .createAndSignTx({
      msgs: [swap],
      chainID: CHAIN_ID,
    })
    .then((tx) => lcd.tx.broadcast(tx, CHAIN_ID))
    .catch((e) => {
      console.log('error in create and sign tx');
      printAxiosError(e);
      throw e;
    })
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      console.log('error in broadcast tx');
      printAxiosError(e);
      throw e;
    });
};

run();
