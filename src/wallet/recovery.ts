// wallet recovery from server

import { Wallet } from './wallet';
import { BACKUP_STATUS, StateCoin } from './statecoin';
import { getRecoveryRequest, RecoveryDataMsg, FeeInfo, getFeeInfo } from './mercury/info_api';

let bitcoin = require('bitcoinjs-lib');
let cloneDeep = require('lodash.clonedeep');

// number of keys to generate per recovery call. If no statecoins are found for this number
// of keys then assume there are no more statecoins owned by this wallet.
const NUM_KEYS_PER_RECOVERY_ATTEMPT = 200;

// Send all proof keys to server to check for statecoins owned by this wallet.
// Should be used as a last resort only due to privacy leakage.
export const recoverCoins = async (wallet: Wallet, gap_limit: number): Promise<RecoveryDataMsg[]> => {
  let recovery_data: any = [];
  let new_recovery_data_load = [null];
  let recovery_request = [];
  let addrs: any = [];

  console.log(gap_limit);

  let addr = wallet.account.getChainAddress(0);
  addrs.push(addr);
  recovery_request.push({key: wallet.getBIP32forBtcAddress(addr).publicKey.toString("hex"), sig: ""});
  let count = 0;
  while (count < gap_limit) {
    for (let i=0; i<NUM_KEYS_PER_RECOVERY_ATTEMPT; i++) {
      let addr = wallet.account.nextChainAddress(0);
      addrs.push(addr);
      recovery_request.push({key: wallet.getBIP32forBtcAddress(addr).publicKey.toString("hex"), sig: ""});
      count++;
    }
    console.log(count);
    new_recovery_data_load = await getRecoveryRequest(wallet.http_client, recovery_request);
    recovery_request = [];
    recovery_data = recovery_data.concat(new_recovery_data_load);
  }
  
  let fee_info: FeeInfo = await getFeeInfo(wallet.http_client)
  // Import the addresses if using electrum-personal-server
  wallet.electrum_client.importAddresses(addrs, wallet.getBlockHeight() - fee_info.initlock);

  return recovery_data
}

// Gen proof key. Address: tb1qgl76l9gg9qrgv9e9unsxq40dee5gvue0z2uxe2. Proof key: 03b2483ab9bea9843bd9bfb941e8c86c1308e77aa95fccd0e63c2874c0e3ead3f5
export const addRestoredCoinDataToWallet = async (wallet: Wallet, wasm: any, recoveredCoins: RecoveryDataMsg[]) => {
  for (let i=0;i<recoveredCoins.length;i++) {
    let tx_backup = bitcoin.Transaction.fromHex(recoveredCoins[i].tx_hex);
    let shared_key= JSON.parse(recoveredCoins[i].shared_key_data)

    // convert c_key item to be clinet curv library compatible
    shared_key.c_key = JSON.parse(wasm.convert_bigint_to_client_curv_version(JSON.stringify({c_key: shared_key.c_key}), "c_key")).c_key

    // construct MasterKey1
    let master_key = {
      chain_code: [0,[]],
      private: {
        x2: wallet.getBIP32forProofKeyPubKey(recoveredCoins[i].proof_key).privateKey!.toString("hex")
      },
      public: shared_key
    }

    let statecoin = new StateCoin(recoveredCoins[i].shared_key_id, master_key)

    let tx_copy = cloneDeep(tx_backup);

    statecoin.proof_key = recoveredCoins[i].proof_key
    statecoin.tx_backup = tx_backup;
    statecoin.backup_status = BACKUP_STATUS.PRE_LOCKTIME;
    statecoin.funding_vout = tx_copy.ins[0].index;
    statecoin.funding_txid = tx_copy.ins[0].hash.reverse().toString("hex");
    statecoin.statechain_id = recoveredCoins[i].statechain_id;
    statecoin.value = recoveredCoins[i].amount;
    statecoin.tx_hex = recoveredCoins[i].tx_hex;
    // statecoin.withdraw_txid = recoveredCoins[i].withdraw_txid;

    statecoin.setConfirmed();
    wallet.statecoins.addCoin(statecoin);
  }

  wallet.saveStateCoinsList();
}
