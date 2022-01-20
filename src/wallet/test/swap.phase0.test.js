import { makeTesterStatecoin } from './test_data.js'
import { Swap, SWAP_STATUS } from "../swap/swap";
import { STATECOIN_STATUS } from '../statecoin'
import { SwapRetryError } from '../swap/swap'
import { Wallet, MOCK_WALLET_NAME } from '../wallet'

let bitcoin = require('bitcoinjs-lib')

let walletName = `${MOCK_WALLET_NAME}_swap_phase0_tests`

// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

async function swapPhase0(swap) {
  swap.next_step = 2
  return await swap.doNext()
}

function getWallet() {
  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
  wallet.config.min_anon_set = 3
  wallet.config.jest_testing_mode = true
  wallet.http_client = http_mock
  wallet.wasm = wasm_mock
  return wallet
}

describe('swapPhase0 test 1 - incorrect initial statecoin phase', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase1;
  //////////////////////////////////////////////////

  it('should throw coin is in wrong swap protocol', async () => {
    let wallet = getWallet();
    let swap = new Swap(wallet, statecoin, null, null) 
    const input = () => {
      return swapPhase0(swap);
    }
    const output = 'phase Phase0:pollUtxo: invalid swap status: Phase1';
    await expect(input()).rejects.toThrowError(output);
  });
})

describe('swapPhase0 test 2 - correct initial statecoin phase', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase0;
  let swap_id = "12345";
  // swapPhase0 calls post to: swap/poll/utxo
  // which takes an id as parameter (the swap_id)
  // mockReturnValueOnce({...}) means: the first time give null to post 
  // the second time give swap id to post
  http_mock.post = jest.fn().mockReset()
    .mockReturnValueOnce({ id: null })    // return once null => swap has not started
    .mockReturnValueOnce({ id: swap_id }) // return once an id => swap has begun
  //////////////////////////////////////////////////

  let wallet = getWallet();
  let swap = new Swap(wallet, statecoin, null, null) 
  it('should have swap_status Phase0, swap_id null', async () => {
    // swap not yet begun
    await swapPhase0(swap)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase0)
    expect(statecoin.swap_id).toBe(null)
  })

  it('should have swap_status Phase1, swap_id not null', async () => {
    // swap begun
    await swapPhase0(swap)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase1)
    expect(statecoin.swap_id.id).toBe(swap_id)
  })
})

describe('swapPhase0 test 3 - coin is not awaiting swap', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = null;
  //////////////////////////////////////////////////
  let wallet = getWallet();
  let swap = new Swap(wallet, statecoin, null, null) 
  it('should throw phase Phase0:pollUtxo: invalid statecoin status: null', async () => {
    const input = () => {
      return swapPhase0(swap);
    }
    const output = 'phase Phase0:pollUtxo: invalid statecoin status: null';
    await expect(input()).rejects.toThrowError(output);
  })
})

describe('swapPhase0 test 4 - poll with no swap_id', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase0;
  //////////////////////////////////////////////////

  let wallet = getWallet();
  let swap = new Swap(wallet, statecoin, null, null) 

  it('should return Retry status', async () => {
    const input = () => {
      return swapPhase0(swap);
    }
    let result = await input()
    await expect(result.is_ok()).toEqual(false)
  })
})

describe('swapPhase0 test 5 - incorrect statechain_id', () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase0;
  statecoin.statechain_id = null;
  //////////////////////////////////////////////////

  let wallet = getWallet();
  let swap = new Swap(wallet, statecoin, null, null) 

  it('should throw error incorrect statechain_id', async () => {
    const input = () => {
      return swapPhase0(swap);
    }
    const output = 'statechain id is invalid';
    await expect(input()).rejects.toThrow(output);
  })
})