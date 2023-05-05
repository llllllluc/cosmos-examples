// create immediately executable job and delay job (executable after 5 blocks, about 30s)
import {
  getCurrentBlockHeight,
  getLCD,
  getMnemonicKey,
  getWallet,
  initWarpSdk,
  printAxiosError,
} from '../util';
import { warp_controller } from '@terra-money/warp-sdk';
import { CreateTxOptions, Coins, MsgExecuteContract } from '@terra-money/terra.js';

function executeMsg<T extends {}>(sender: string, contract: string, msg: T, coins?: Coins.Input) {
  return new MsgExecuteContract(sender, contract, msg, coins);
}

const mnemonicKey = getMnemonicKey(true);
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const warpSdk = initWarpSdk(lcd, wallet);
const owner = wallet.key.accAddress;

const amount1Luna = (1_000_000).toString();

const run = async () => {
  // send money to myself
  const msg = {
    bank: {
      send: {
        amount: [{ denom: 'uluna', amount: amount1Luna }],
        to_address: owner,
      },
    },
  };

  const conditionAlwaysTrue: warp_controller.Condition = {
    expr: {
      block_height: {
        comparator: '0',
        op: 'gt',
      },
    },
  };

  const conditionAlwaysFalse: warp_controller.Condition = {
    expr: {
      block_height: {
        comparator: '0',
        op: 'lt',
      },
    },
  };

  const delayBlock = 5;
  const blockHeightDelay = BigInt(await getCurrentBlockHeight(lcd)) + BigInt(delayBlock);
  const conditionDelay5BlocksTrue: warp_controller.Condition = {
    expr: {
      block_height: {
        comparator: blockHeightDelay.toString(),
        op: 'gt',
      },
    },
  };

  const createJobMsgConditionAlwaysTrue: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysTrue,
    name: 'test_job_condition_always_true',
    recurring: false,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysFalse: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysFalse,
    name: 'test_job_condition_always_false',
    recurring: false,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionDelay5BlocksTrue = {
    condition: conditionDelay5BlocksTrue,
    name: 'test_delay',
    recurring: false,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysTrueRequeueOnEvict: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysTrue,
    name: 'test_job_condition_always_true_requeue_on_evict_job',
    recurring: false,
    requeue_on_evict: true,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysFalseRequeueOnEvict: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysFalse,
    name: 'test_job_condition_always_false_requeue_on_evict_job',
    recurring: false,
    requeue_on_evict: true,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysTrueRecurring: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysTrue,
    name: 'test_job_condition_always_true_recurring',
    recurring: true,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  // this should only be evicted but never executed
  const createJobMsgConditionAlwaysFalseRecurring: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysFalse,
    name: 'test_job_condition_always_false_recurring',
    recurring: true,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysTrueRequeueAndRecurring: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysTrue,
    name: 'test_job_condition_always_true_requeue_and_recurring',
    recurring: true,
    requeue_on_evict: true,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysFalseRequeueAndRecurring: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysFalse,
    name: 'test_job_condition_always_false_requeue_and_recurring',
    recurring: true,
    requeue_on_evict: true,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobCosmosMsg = executeMsg<
    Extract<warp_controller.ExecuteMsg, { create_job: warp_controller.CreateJobMsg }>
  >(owner, warpSdk.contractAddress, {
    create_job: createJobMsgConditionAlwaysTrue,
  });

  const deleteJobCosmosMsgs = executeMsg<
    Extract<warp_controller.ExecuteMsg, { delete_job: warp_controller.DeleteJobMsg }>
  >(owner, warpSdk.contractAddress, {
    delete_job: {
      id: '306',
    },
  });

  const msgs = [];
  // we can put 175 createJobMsgConditionAlwaysTrue in 1 tx before hitting gas limit
  // for (let i = 0; i < 175; i++) {
  for (let i = 0; i < 3; i++) {
    msgs.push(createJobCosmosMsg);
  }

  const currentSequence = await wallet.sequence();

  const txOptions1: CreateTxOptions & {
    sequence: number;
  } = {
    msgs: [createJobCosmosMsg],
    sequence: currentSequence,
  };
  const tx1 = await wallet
    .createAndSignTx(txOptions1)
    .then((tx) => {
      console.log(`successfully created tx: ${tx}`);
      return tx;
    })
    .catch((e) => {
      console.log('error createAndSignTx');
      printAxiosError(e);
      throw e;
    });
  wallet.lcd.tx
    .broadcast(tx1)
    .then((result) => {
      console.log(`successfully broadcasted tx, result: ${result}`);
      return result;
    })
    .catch((e) => {
      console.log('error broadcast');
      printAxiosError(e);
      throw e;
    });

  const txOptions2: CreateTxOptions & {
    sequence: number;
  } = {
    msgs: [createJobCosmosMsg],
    sequence: currentSequence + 1,
  };
  const tx2 = await wallet
    .createAndSignTx(txOptions2)
    .then((tx) => {
      console.log(`successfully created tx: ${tx}`);
      return tx;
    })
    .catch((e) => {
      console.log('error createAndSignTx');
      printAxiosError(e);
      throw e;
    });
  wallet.lcd.tx
    .broadcast(tx2)
    .then((result) => {
      console.log(`successfully broadcasted tx, result: ${result}`);
      return result;
    })
    .catch((e) => {
      console.log('error broadcast');
      printAxiosError(e);
      throw e;
    });
};

run();
