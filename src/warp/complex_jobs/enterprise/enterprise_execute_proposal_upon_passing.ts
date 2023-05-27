import Big from 'big.js';
import { MsgExecuteContract, MsgSend } from '@terra-money/feather.js';
import {
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpAccountAddress,
  getWarpJobCreationFeePercentage,
  printAxiosError,
  toBase64,
} from '../../../util';
import {
  CHAIN_ID,
  CHAIN_PREFIX,
  ENTERPRISE_DAO_ADDRESS,
  WARP_CONTROLLER_ADDRESS,
} from '../../../env';

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const enterpriseDaoAddress = ENTERPRISE_DAO_ADDRESS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

// note: as of now enterprise id is number rather than string like warp job id
// in general id is either in string number or number, try both if one doesn't work
const proposalId = 1;

const lunaAmount1 = (1_000_000).toString();

const run = async () => {
  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(lcd);
  const warpAccountAddress = await getWarpAccountAddress(lcd, myAddress);

  const lunaJobReward = lunaAmount1;
  const lunaJobRewardAndCreationFee = Big(lunaJobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    .toString();

  // TODO: warp currently doesn't support create account and fund it in 1 tx, but it's in feature branch
  // const createWarpAccount = new MsgExecuteContract(myAddress, warpControllerAddress, {
  //   create_account: {},
  // });

  const fundWarpAccountForJobRewardAndCreationFee = new MsgSend(myAddress, warpAccountAddress, {
    uluna: lunaJobRewardAndCreationFee,
  });

  const executeProposalMsg = {
    execute_proposal: {
      proposal_id: proposalId,
    },
  };

  const executeProposal = {
    wasm: {
      execute: {
        contract_addr: enterpriseDaoAddress,
        msg: toBase64(executeProposalMsg),
        funds: [], // fund is required field, but we don't need to fund anything
      },
    },
  };

  const enterpriseExecuteProposalJsonString = JSON.stringify(executeProposal);

  const queryEnterpriseProposalStatusMsg = {
    proposal_status: {
      proposal_id: proposalId,
    },
  };

  const jobVarName = 'enterprise-proposal-status';
  const jobVar = {
    query: {
      // kind: 'int', // uint, amount, decimal are all allowed
      kind: 'string', // only int is not allowed since it expects result to be number, in fact result is string
      name: jobVarName,
      init_fn: {
        query: {
          wasm: {
            smart: {
              msg: toBase64(queryEnterpriseProposalStatusMsg),
              contract_addr: enterpriseDaoAddress,
            },
          },
        },
        selector: '$.status',
      },
      reinitialize: false,
    },
  };

  // NOTE: this doesn't work right now, enterprise will keep the proposal status as 'in_progress' even it's executable
  // enterprise UI has a function to check the proposal voting result and determine whether it's executable
  // we need to replicate that function in warp condition check to make it work
  const expectedEnterpriseProposalStatus = 'passed';

  const condition = {
    expr: {
      string: {
        op: 'eq',
        left: {
          ref: `$warp.variable.${jobVarName}`,
        },
        right: {
          simple: expectedEnterpriseProposalStatus,
        },
      },
    },
  };

  const createJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: 'enterprise_execute_proposal_upon_passing',
      recurring: false,
      requeue_on_evict: false,
      reward: lunaJobReward,
      condition: condition,
      msgs: [enterpriseExecuteProposalJsonString],
      vars: [jobVar],
    },
  });

  wallet
    .createAndSignTx({
      msgs: [fundWarpAccountForJobRewardAndCreationFee, createJob],
      // msgs: [createJob],
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
