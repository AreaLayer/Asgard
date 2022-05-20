// wallet recovery from server

import { Transaction } from "bitcoinjs-lib";
import { Wallet } from './wallet';
import { BACKUP_STATUS, StateCoin, WithdrawalTxBroadcastInfo } from './statecoin';
import { WithdrawMsg2 } from './mercury/withdraw';
import {
  getRecoveryRequest, RecoveryDataMsg, FeeInfo, getFeeInfo,
  getStateChain, getStateChainTransferFinalizeData, TransferFinalizeDataAPI
} from './mercury/info_api';
import { StateChainSig, encodeSCEAddress, getTxFee } from "./util";
import { GET_ROUTE } from '.';
import {
  transferReceiverFinalizeRecovery, TransferFinalizeDataForRecovery
} from './mercury/transfer';
import { setProgressComplete, setProgress} from "../features/WalletDataSlice";
import { forEachChild } from "typescript";


let bitcoin = require('bitcoinjs-lib');
let cloneDeep = require('lodash.clonedeep');

let EC = require('elliptic').ec
let secp256k1 = new EC('secp256k1')
const n = secp256k1.curve.n

// number of keys to generate per recovery call. If no statecoins are found for this number
// of keys then assume there are no more statecoins owned by this wallet.
const NUM_KEYS_PER_RECOVERY_ATTEMPT = 200;

// Send all proof keys to server to check for statecoins owned by this wallet.
// Should be used as a last resort only due to privacy leakage.
export const recoverCoins = async (wallet: Wallet, gap_limit: number, dispatch: any): Promise<RecoveryDataMsg[]> => {
  let recovery_data: any = [];
  let new_recovery_data_load = [null];
  let recovery_request = [];
  let addrs: any = [];

  let addr = wallet.account.getChainAddress(0);
  addrs.push(addr);
  recovery_request.push({ key: wallet.getBIP32forBtcAddress(addr).publicKey.toString("hex"), sig: "" });
  let count = 0;
  let percentageComplete
  while (count < gap_limit) {
    for (let i = 0; i < NUM_KEYS_PER_RECOVERY_ATTEMPT; i++) {
      percentageComplete = Math.floor( wallet.account.chains[0].k /(Math.ceil( gap_limit / NUM_KEYS_PER_RECOVERY_ATTEMPT ) * NUM_KEYS_PER_RECOVERY_ATTEMPT )*100);
      dispatch(setProgress({msg: percentageComplete}));

      let addr = wallet.account.nextChainAddress(0);
      addrs.push(addr);
      recovery_request.push({ key: wallet.getBIP32forBtcAddress(addr).publicKey.toString("hex"), sig: "" });
      count++;
    }
    new_recovery_data_load = await getRecoveryRequest(wallet.http_client, recovery_request);
    recovery_request = [];
    recovery_data = recovery_data.concat(new_recovery_data_load);

    if(count > gap_limit){
      // Once upper limit of addresses have been searched set graphic load complete
      dispatch(setProgressComplete(""))
    }
  }

  let fee_info: FeeInfo = await getFeeInfo(wallet.http_client)
  // Import the addresses if using electrum-personal-server
  wallet.electrum_client.importAddresses(addrs, wallet.getBlockHeight() - fee_info.initlock);

  return recovery_data
}

export const getFinalizeDataForRecovery = async (wallet: Wallet, wasm: any, recovery_data: RecoveryDataMsg):
  Promise<TransferFinalizeDataForRecovery> => {
  // make new function that return statechain id and does relevant check
  let sc_tf_data: TransferFinalizeDataAPI = await getStateChainTransferFinalizeData(wallet.http_client, recovery_data.statechain_id);
  let state_chain_data = await getStateChain(wallet.http_client, recovery_data.statechain_id);

  const chain = state_chain_data.chain;
  const last = chain[chain.length - 2].next_state;
  let sig = new StateChainSig(last.purpose, last.data, last.sig);

  if (sig.purpose !== sc_tf_data.statechain_sig.purpose) {
    throw new Error(`expected statechain sig purpose ${JSON.stringify(sig.purpose)}, 
      got ${JSON.stringify(sc_tf_data.statechain_sig.purpose)}}`)
  }

  if (sig.data !== sc_tf_data.statechain_sig.data) {
    throw new Error(`expected statechain sig data ${JSON.stringify(sig.data)}, 
      got ${JSON.stringify(sc_tf_data.statechain_sig.data)}}`)
  }

  if (sig.sig !== sc_tf_data.statechain_sig.sig) {
    throw new Error(`expected statechain sig sig ${JSON.stringify(sig.sig)}, 
      got ${JSON.stringify(sc_tf_data.statechain_sig.sig)}}`)
  }

  let proof_key = recovery_data.proof_key;
  let tx_backup = Transaction.fromHex(recovery_data.tx_hex);
  // Get SE address that funds are being sent to.
  let back_up_rec_addr = bitcoin.address.fromOutputScript(tx_backup.outs[0].script, wallet.config.network);
  let se_rec_addr_bip32 = wallet.getBIP32forBtcAddress(back_up_rec_addr);
  if (!se_rec_addr_bip32) {
    throw new Error(`Key derivation for address ${back_up_rec_addr} not found in wallet`)
  }
  let o2_keypair = se_rec_addr_bip32;
  let o2 = o2_keypair.privateKey!.toString("hex");

  let finalize_data: TransferFinalizeDataForRecovery = {
    new_shared_key_id: sc_tf_data.new_shared_key_id,
    o2: o2,
    statechain_data: state_chain_data,
    proof_key: proof_key,
    statechain_id: recovery_data.statechain_id,
    tx_backup_hex: recovery_data.tx_hex,
  }

  return finalize_data
}

// Reconstruct the WithdrawalTxBroadcastInfo for each recoverd statecoin that is withdrawing
export const groupRecoveredWithdrawalTransactions = (
    withdrawal_tx_map: Map<string,
    Set<string>>,
    withdrawal_addr_map: Map<string, string>,
  statecoins: Map<string, StateCoin>) => {
  withdrawal_tx_map.forEach((ids, tx_hex) => {
    const tx = Transaction.fromHex(tx_hex)
    let tx_fee = 0
    const ids_arr = Array.from(ids)
    if (ids_arr.length != tx.ins.length) {
      console.log(`ids_arr.length: ${ids_arr.length}, tx.ins.length: ${tx.ins.length}`)
      ids.forEach((id) => {
        console.log(`deleting statecoin id: ${id}`)
        statecoins.delete(id)
      })
      return
    } 
    ids.forEach((id) => {
        const sc = statecoins.get(id)
        const sc_value = sc != null ? sc.value : 0
      tx_fee = tx_fee + sc_value
    })
    tx.outs.forEach((output) => {
      tx_fee = tx_fee - output.value
    })
    const rec_addr = withdrawal_addr_map.get(tx.getId())
    if (rec_addr == null) {
      return
    }
    ids.forEach((id) => {
      let statecoin = statecoins.get(id)  
      if (statecoin != null) {
        statecoin.tx_withdraw_broadcast.push(new WithdrawalTxBroadcastInfo(
          tx_fee, tx, { shared_key_ids: ids_arr }, rec_addr));  
      }
    })
  })
}

// Gen proof key. Address: tb1qgl76l9gg9qrgv9e9unsxq40dee5gvue0z2uxe2. Proof key: 03b2483ab9bea9843bd9bfb941e8c86c1308e77aa95fccd0e63c2874c0e3ead3f5
export const addRestoredCoinDataToWallet = async (wallet: Wallet, wasm: any, recoveredCoins: RecoveryDataMsg[]) => {
  let withdrawal_tx_map = new Map()
  let withdrawal_addr_map = new Map()
  let statecoins = new Map()
  for (let i = 0; i < recoveredCoins.length; i++) {
    let statecoin = null
    // if shared_key === 'None' && transfer_msg3 available
    if (recoveredCoins[i].shared_key_data === 'None') {
      let finalize_data_for_recovery = await getFinalizeDataForRecovery(wallet, wasm, recoveredCoins[i]);
      statecoin = await transferReceiverFinalizeRecovery(wallet.http_client, wasm, finalize_data_for_recovery);
    } else {
      let shared_key = JSON.parse(recoveredCoins[i].shared_key_data)
      // convert c_key item to be clinet curv library compatible
      shared_key.c_key = JSON.parse(wasm.convert_bigint_to_client_curv_version(JSON.stringify({ c_key: shared_key.c_key }), "c_key")).c_key

      // construct MasterKey1
      let master_key = {
        chain_code: [0, []],
        private: {
          x2: wallet.getBIP32forProofKeyPubKey(recoveredCoins[i].proof_key).privateKey!.toString("hex")
        },
        public: shared_key
      }

      statecoin = new StateCoin(recoveredCoins[i].shared_key_id, master_key)
    }

    if (statecoin) {

      if (recoveredCoins[i].statechain_id) {
        // deposited coin
        let tx_backup = bitcoin.Transaction.fromHex(recoveredCoins[i].tx_hex);
        let tx_copy = cloneDeep(tx_backup);

        statecoin.proof_key = recoveredCoins[i].proof_key
        statecoin.tx_backup = tx_backup;
        statecoin.backup_status = BACKUP_STATUS.PRE_LOCKTIME;
        statecoin.funding_vout = tx_copy.ins[0].index;
        statecoin.funding_txid = tx_copy.ins[0].hash.reverse().toString("hex");
        statecoin.statechain_id = recoveredCoins[i].statechain_id;
        statecoin.value = recoveredCoins[i].amount;
        statecoin.tx_hex = recoveredCoins[i].tx_hex;
        statecoin.sc_address = encodeSCEAddress(statecoin.proof_key);
        const withdrawing = recoveredCoins[i].withdrawing
        if (withdrawing != 'None') {
          console.log(`recovered coin ${i} withdrawing: ${JSON.stringify(recoveredCoins[i].withdrawing)}`)
          statecoin.setWithdrawing();
          const tx_hex = withdrawing.tx_hex
          const withdraw_transaction = Transaction.fromHex(tx_hex)

          let ids = withdrawal_tx_map.get(tx_hex)
          if (ids == null) {
            ids = new Set()
          } 
          ids.add(statecoin.shared_key_id)
          withdrawal_tx_map.set(tx_hex, ids)
          withdrawal_addr_map.set(withdraw_transaction.getId(), withdrawing.rec_addr)
        } else {
          statecoin.setConfirmed();
        }
      } else {
        // generated address
        statecoin.proof_key = recoveredCoins[i].proof_key;
        statecoin.is_deposited = true;
        statecoin.value = 100000;
        statecoin.sc_address = encodeSCEAddress(statecoin.proof_key);

        // update shared pubkey
        var se_key_share = secp256k1.keyFromPublic(statecoin.shared_key.public.p1, 'hex');
        var priv_key = secp256k1.keyFromPrivate(statecoin.shared_key.private.x2, 'hex');

        var shared_pub = se_key_share.getPublic().mul(priv_key.getPrivate());

        var x = shared_pub.getX();
        var y = shared_pub.getY();

        statecoin.shared_key.public.q.x = x.toString('hex');
        statecoin.shared_key.public.q.y = y.toString('hex');

      }

      statecoins.set(statecoin.shared_key_id, statecoin)
    }
  }
  groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_addr_map, statecoins)

  statecoins.forEach((statecoin, _) => {
    wallet.statecoins.addCoin(statecoin);
  })
  await wallet.saveStateCoinsList();
}
