'use strict';
import React, { useState, useEffect } from 'react';
import {withRouter} from "react-router-dom";
import {useDispatch} from 'react-redux';
import {Tabs, Tab} from 'react-bootstrap';
import {setError, walletFromMnemonic, walletFromJson} from '../../features/WalletDataSlice'
import {CreateWizardForm} from '../../components'
import eyeIcon from "../../images/eye-icon.svg";
import eyeIconOff from "../../images/eye-icon-off.svg"
import { Storage } from '../../store';
import { parseBackupData } from '../../wallet/wallet'

import  './RestoreWallet.css'

let bip39 = require('bip39');


const RestoreWalletPage = (props) => {
  const dispatch = useDispatch();
  const [showPass, setShowPass] = useState(false);
  const toggleShowPass = () => setShowPass(!showPass);
  const [state, setState] = useState(
    {
      wallet_name: "",
      wallet_password: "",
      mnemonic: "",
      gap_limit: ""
    });
  const setStateWalletName = (event) => setState({...state, wallet_name: event.target.value});
  const setStateWalletPassword = (event) => setState({...state, wallet_password: event.target.value});
  const setStateMnemonic = (event) => setState({...state, mnemonic: event.target.value});
  const setStateGapLimit = (event) => setState({...state, gap_limit: event.target.value});

  // Confirm mnemonic is valid
  const onClickConf = () => {
    let store = new Storage("wallets/wallet_names");
    let wallet_names = store.getWalletNames();

    if (wallet_names.indexOf(state.wallet_name)!==-1) {
      dispatch(setError({msg: "Wallet with name "+state.wallet_name+" already exists."}));
      return;
    }
    
    if (wallet_names.filter(wallet => wallet.name === state.wallet_name).length > 0) {
      dispatch(setError({msg: "Wallet with name "+state.wallet_name+" already exists."}))
      return
    }

    if (!bip39.validateMnemonic(state.mnemonic)) {
      dispatch(setError({msg: "Invalid mnemonic"}));
      return;
    }

    if (state.gap_limit === parseInt(state.gap_limit, 10)) {
      dispatch(setError({msg: "Address limit must be a positive integer"}));
      return;
    }

    
    // Create wallet and load into Redux state
    try {
      walletFromMnemonic(dispatch, state.wallet_name, state.wallet_password, state.mnemonic, props.history ,true, Number(state.gap_limit));
    } catch (e) {
      dispatch(setError({msg: e.message}));
    }
    props.setWalletLoaded(true);
  }

  const handleSelectBackupFile = () => {
    window.postMessage({
      type: 'select-backup-file'
    })
  }

  useEffect(() => {
    const handleImportWalletData = async (event, backupData) => {
      try {
        const walletJson = parseBackupData(backupData);

        walletJson.name = walletJson.name + '_backup';

        let store = new Storage("wallets/wallet_names");
        let wallet_names = store.getWalletNames();
        //Check for if wallet name already exists, check in above directory
        if (wallet_names.filter(wallet => wallet.name === walletJson.name).length > 0) {
          // Check for file with this wallet name
          dispatch(setError({msg: "Wallet with name "+walletJson.name+" already exists."}));
          return
        }
       
        const wallet = await walletFromJson(walletJson, state.wallet_password);
        if(!wallet) {
          throw new Error("error loading wallet")
        } else {
          props.history.push('/home');
          props.setWalletLoaded(true);
        }
      } catch (error) {
        console.error(error);
        dispatch(setError({msg: `Error restoring wallet from file. ${error}`}));
      }
    }

    window.electron.ipcRenderer.on('received-backup-data', handleImportWalletData);
    return () => window.electron.ipcRenderer.removeListener('received-backup-data', handleImportWalletData);
  }, [state, dispatch, props])

  return (
    <div className="restore-wallet-wrap">
      <Tabs defaultActiveKey={'Restore from Seed'}>
          <Tab eventKey={'Restore from Seed'} title={'Restore from Seed'}>
            <div className="restore-form">
              <CreateWizardForm
                wizardState={state}
                onSubmit={onClickConf}
                setStateWalletName={setStateWalletName}
                setStateWalletPassword={setStateWalletPassword}
                setStateMnemonic={setStateMnemonic}
                setStateGapLimit={setStateGapLimit}
                submitTitle="Confirm"
              />
            </div>
          </Tab>
          <Tab eventKey="Restore from Backup" title="Restore from Backup">
            <div className="restore-form">
              <div className="inputs-item">
                <input 
                  type={showPass ? 'text' : 'password'} name="password"
                  placeholder="Password"
                  onChange={setStateWalletPassword}
                />
                <span className={'eye-icon'} onClick={toggleShowPass}>
                    {showPass ? <img alt="eyeIconOff" src={eyeIconOff} /> : <img alt="eyeIcon" src={eyeIcon} />}
                </span>
              </div>

              <button 
                type="button" 
                onClick={handleSelectBackupFile}
                className="Body-button blue backup-btn">Select Your Backup File</button>
            </div>
          </Tab>
      </Tabs>
    </div>
  )
}

export default withRouter(RestoreWalletPage);