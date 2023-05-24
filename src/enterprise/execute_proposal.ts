import { CHAIN_ID, ENTERPRISE_DAO_ADDRESS } from '../env';
import { MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet } from '../util';

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const enterpriseDaoAddress = ENTERPRISE_DAO_ADDRESS!;

export const executeProposal = async () => {
  const executeMsg = {
    execute_proposal: {
      proposal_id: 1,
    },
  };
  const execute = new MsgExecuteContract(
    wallet.key.accAddress('terra'), // sender
    // localterra
    // "terra1v99r4pl7z5d8nhvm7lrevutqyr4snvu90h3mvfqqwglce30v7vnqh8z37m", // contract account address
    // testnet multisig dao
    // "terra1cwc0wuxhyjf6yxugpq0yp04alteazxhe69wd5gdxq9uxusm7mrrqu3nvlc",
    // testnet ft token dao
    enterpriseDaoAddress,
    { ...executeMsg } // handle msg
    // { uluna: 100000 } // coins
  );

  const executeTx = await wallet.createAndSignTx({
    msgs: [execute],
    chainID: CHAIN_ID,
  });

  lcd.tx.broadcast(executeTx, CHAIN_ID).then((result) => console.log(result));
};
