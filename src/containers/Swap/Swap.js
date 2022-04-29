import { Link, withRouter, Redirect } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import React, { useState, useEffect } from 'react';
import { Swaps, StdButton, Tutorial, CoinsList } from "../../components";
import Loading from "../../components/Loading/Loading";
import {
  isWalletLoaded,
  setError,
  setWarning,
  callDoAutoSwap,
  callDoSwap,
  callSwapDeregisterUtxo,
  callGetSwapGroupInfo,
  callUpdateSwapGroupInfo,
  callGetConfig,
  callGetStateCoin,
  addCoinToSwapRecords,
  removeCoinFromSwapRecords,
  addSwapPendingCoin,
  removeSwapPendingCoin,
  handleEndSwap,
  addInSwapValue,
  updateInSwapValues,
  removeInSwapValue,
  checkSwapAvailability
} from "../../features/WalletDataSlice";
import { fromSatoshi, STATECOIN_STATUS } from '../../wallet';
import './Swap.css';


const SwapPage = () => {
  const dispatch = useDispatch();
  let disabled = false;
  const [selectedCoins, setSelectedCoins] = useState([]); // store selected coins shared_key_id
  const [selectedSwap, setSelectedSwap] = useState(null); // store selected swap_id
  const [refreshCoins, setRefreshCoins] = useState(false); // Update Coins model to force re-render
  const { torInfo, inSwapValues } = useSelector(state => state.walletData);

  const [swapLoad, setSwapLoad] = useState({ join: false, swapCoin: "", leave: false }) // set loading... onClick
  const [refreshSwapGroupInfo, setRefreshSwapGroupInfo] = useState(false)
  const [initFetchSwapGroups, setInitFetchSwapGroups] = useState(true)

  const [swapGroupsData, setSwapGroupsData] = useState([]);

  function addSelectedCoin(statechain_id) {
    setSelectedCoins(
      prevSelectedCoins => {
        let newSelectedCoins = [];
        const isStatechainId = (element) => element === statechain_id;
        let index = prevSelectedCoins.findIndex(isStatechainId);
        if (index === -1) {
          newSelectedCoins = [statechain_id];
        }
        return newSelectedCoins;
      }
    );
  }

  const updateSwapInfo = async (isMounted) => {
    if (isMounted === true) {  
      dispatch(callUpdateSwapGroupInfo());
      let swap_groups_data = callGetSwapGroupInfo();
      let swap_groups_array = swap_groups_data ? Array.from(swap_groups_data.entries()) : [];
      let sorted_swap_groups_entry = swap_groups_array.sort((a, b) => b[0].amount - a[0].amount)
      setSwapGroupsData(sorted_swap_groups_entry) //update state to refresh TransactionDisplay render
      setRefreshCoins((prevState) => !prevState);
      setInitFetchSwapGroups(false)
    }
  }

  // Update swap info when swapLoad or setRefreshSwapGroupInfo changes.
  // The delay on joining is to wait for the coin to be added to a swap group.
  useEffect(() => {
    if (torInfo.online === false) {
      return
    }
    let isMounted = true
    let delay = swapLoad.join ? 500 : 0;
    setTimeout(() => {
      updateSwapInfo(isMounted)
    }, delay);
    return () => { isMounted = false }
  },
    [swapLoad, refreshSwapGroupInfo]);

  // Check if wallet is loaded. Avoids crash when Electrorn real-time updates in developer mode.
  if (!isWalletLoaded()) {
    return <Redirect to="/" />;
  }

  const swapButtonAction = async () => {

    // check electrum connection before swap start
    if (torInfo.online === false) {
      dispatch(setError({ msg: "Disconnected from the mercury server" }))
      return
    }

    // check statecoin is chosen before swap start
    if (selectedCoins.length === 0) {
      dispatch(setError({ msg: "Please choose a StateCoin to swap." }))
      return
    }
    if (swapLoad.join === true) {
      // If swap Join Group button loading, then no action
      return
    }

    // Warning on first swap group enter, to not exit wallet mid-swap
    dispatch(setWarning({ key: "swap_punishment", msg: "WARNING! Exit the wallet whilst a swap is live causes the swap to fail and coins to be temporarily banned from entering swaps." }))

    let swapValues = new Set(inSwapValues)
    let randomOrderIndices = []
    for (let i = 0; i < selectedCoins.length; i++) {
      randomOrderIndices.push(i)
    }
    randomOrderIndices.sort(() => Math.random() - 0.5)

    for (let i = 0; i < selectedCoins.length; i++) {
      const j = randomOrderIndices[i]
      let selectedCoin = selectedCoins[j]
      let statecoin = callGetStateCoin(selectedCoin);
      if (checkSwapAvailability(statecoin, swapValues)) {
        swapValues.add(statecoin.value)
        dispatch(addCoinToSwapRecords(selectedCoin));
        setSwapLoad({ ...swapLoad, join: true, swapCoin: statecoin })
        dispatch(callDoSwap({ "shared_key_id": selectedCoin }))
          .then(res => {

            handleEndSwap(dispatch, selectedCoin, res, setSwapLoad, swapLoad, fromSatoshi)
          });
      }
    }
    dispatch(updateInSwapValues([...swapValues]))
    // Refresh Coins list
    setTimeout(() => { setRefreshCoins((prevState) => !prevState); }, 1000);
  }

  const handleAutoSwap = async (item) => {
    if (item.status === 'UNCONFIRMED' || item.status === 'IN_MEMPOOL') {
      return;
    }

    let statecoin = callGetStateCoin(item.shared_key_id);
    // get the statecoin and set auto to true - then call auto_swap
    let selectedCoin = item.shared_key_id;

    // check statechain is chosen
    if (torInfo.online === false) {
      dispatch(setError({ msg: "Disconnected from the mercury server" }))
      return
    }

    if (statecoin === undefined) {
      dispatch(setError({ msg: "Please choose a StateCoin to swap." }))
      return
    }

    if (swapLoad.join === true) {
      return
    }

    // turn off swap_auto
    if (item.swap_auto) {
      dispatch(removeSwapPendingCoin(item.shared_key_id))
      dispatch(removeInSwapValue(statecoin.value))
      statecoin.swap_auto = false;
      setSwapLoad({ ...swapLoad, leave: true })
      try {
        await dispatch(callSwapDeregisterUtxo({ "shared_key_id": selectedCoin, "dispatch": dispatch, "autoswap": true }))
        dispatch(() => {
          removeCoinFromSwapRecords(selectedCoin)
        });
        setSwapLoad({ ...swapLoad, leave: false })
      } catch (e) {
        setSwapLoad({ ...swapLoad, leave: false })
        console.log(`dereg - caught error - ${e}`)
        if (!e.message.includes("Coin is not in a swap pool")) {
          dispatch(setError({ msg: e.message }))
        }
      } finally {
        // Refresh Coins list
        setTimeout(() => { setRefreshCoins((prevState) => !prevState); }, 1000);
      }
      return
    } else {
      statecoin.swap_auto = true
      dispatch(callDoAutoSwap(selectedCoin));
      dispatch(addCoinToSwapRecords(selectedCoin));
      setSwapLoad({ ...swapLoad, join: true, swapCoin: callGetStateCoin(selectedCoin) });

      if (checkSwapAvailability(statecoin, new Set(inSwapValues))) {
        // if StateCoin in not already in swap group
        dispatch(addInSwapValue(statecoin.value))
        dispatch(callDoSwap({ "shared_key_id": selectedCoin }))
          .then(res => {
            handleEndSwap(dispatch, selectedCoin, res, setSwapLoad, swapLoad, fromSatoshi)
          })
      } else {
        setSwapLoad({ ...swapLoad, join: false, swapCoin: callGetStateCoin(selectedCoin) });
        dispatch(addSwapPendingCoin(item.shared_key_id))
      }
    }

    // Refresh Coins list
    setTimeout(() => { setRefreshCoins((prevState) => !prevState); }, 1000);
  }



  const leavePoolButtonAction = (event) => {
    if (torInfo.online === false) {
      dispatch(setError({ msg: "Disconnected from Mercury server" }))
      return
    }

    if (selectedCoins.length === 0) {
      dispatch(setError({ msg: "Please choose a StateCoin to remove." }))
      return
    }

    if (swapLoad.leave === true) {
      return
    }

    setSwapLoad({ ...swapLoad, leave: true })
    try {
      selectedCoins.forEach(
        (selectedCoin) => {
          dispatch(callSwapDeregisterUtxo({ "shared_key_id": selectedCoin, "dispatch": dispatch }))
            .then(res => {
              dispatch(removeCoinFromSwapRecords(selectedCoin));
              dispatch(removeSwapPendingCoin(selectedCoin))
              setSwapLoad({ ...swapLoad, leave: false })
            });
        }
      );
      // Refresh Coins list
      setTimeout(() => { setRefreshCoins((prevState) => !prevState); }, 1000);
    } catch (e) {
      event.preventDefault();
      setSwapLoad({ ...swapLoad, leave: false })
      dispatch(setError({ msg: e.message }))
    }
  }
  let current_config;
  try {
    current_config = callGetConfig();
  } catch (error) {
    console.warn('Can not get config', error)
  }

  if (swapLoad.swapCoin.swap_status) {
    //If coin selected for swap has swap_status, stop Loading...
    setSwapLoad({ ...swapLoad, join: false, swapCoin: "" })
  }
  return (
    <div className={`${current_config?.tutorials ? 'container-with-tutorials' : ''}`}>
      <div className="container ">
        {disabled === true ?
          <p> Swapping is currenlty not available. </p>
          :
          <>
            <div className="swap">
              <div className="wallet-container swap-header">
                <div>
                  <h2 className="WalletAmount">
                    <svg width="30" height="41" viewBox="0 0 30 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.8848 6.31494V0.98291L7.77685 8.09131L14.8848 15.2007V9.86866C20.7773 9.86866 25.5483 14.6401 25.5483 20.5327C25.5483 22.3364 25.0967 24.0239 24.3135 25.5171L26.9092 28.1118C28.2861 25.9087 29.1045 23.3228 29.1045 20.5327C29.1045 12.6763 22.7412 6.31496 14.8848 6.31496L14.8848 6.31494ZM14.8848 31.1968C8.99414 31.1968 4.22119 26.4253 4.22119 20.5327C4.22119 18.7271 4.67432 17.0415 5.45605 15.5483L2.86181 12.9517C1.48486 15.1567 0.666992 17.7427 0.666992 20.5327C0.666992 28.3882 7.03027 34.7505 14.8848 34.7505V40.0825L21.9946 32.9741L14.8848 25.8647V31.1968Z" fill="var(--primary)" />
                    </svg>
                        Swap Statecoins
                    </h2>
                  <h3 className="subtitle">Swap statecoins to increase their anonymity</h3>
                </div>
                <Link className="nav-link" to="/home">
                  <StdButton
                    label="Back"
                    className="Body-button transparent" />
                </Link>
              </div>
              <div className="swap content">
                <div className="wallet-container left ">
                  <div>
                    <span className="sub">Click to select coins below</span>
                    <CoinsList
                      displayDetailsOnClick={false}
                      showCoinStatus={true}
                      selectedCoins={selectedCoins}
                      setSelectedCoin={addSelectedCoin}
                      setSelectedCoins={setSelectedCoins}
                      refresh={refreshCoins}
                      handleAutoSwap={handleAutoSwap}
                      setRefreshSwapGroupInfo={setRefreshSwapGroupInfo}
                      swap
                    />
                  </div>

                </div>
                <div className="wallet-container right">
                  <div>
                    <Swaps
                      swapGroupsData={swapGroupsData}
                      displayDetailsOnClick={false}
                      selectedSwap={selectedSwap}
                      setSelectedSwap={setSelectedSwap}
                      initFetchSwapGroups={initFetchSwapGroups}
                      torOnline={torInfo.online}
                    />
                  </div>
                  <div className="swap-footer-btns">
                    <button type="button" className="btn" onClick={swapButtonAction}>
                      {swapLoad.join ? (<Loading />) : ("Join Group")}
                    </button>
                    <button type="button" className="btn" onClick={leavePoolButtonAction}>
                      {swapLoad.leave ? (<Loading />) : ("Leave Group")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        }
      </div>
      {current_config?.tutorials && <Tutorial />}
    </div>
  )
}

export default withRouter(SwapPage);
