import settings from "../../images/settings.png";
import icon2 from "../../images/icon2.png";

import {Link, withRouter} from "react-router-dom";
import React, {useState} from 'react';
import { useDispatch, useSelector } from 'react-redux'

import { setError, callGetCoinBackupTxData } from '../../features/WalletDataSlice'
import { Coins, StdButton } from "../../components";

import './BackupTx.css';

const DEFAULT_TX_DATA = {tx_backup_hex:"",priv_key_hex:"",key_wif:"",expiry_data:{blocks:"",days:"",months:""}};

const BackupTxPage = () => {
  const dispatch = useDispatch();
  const block_height = useSelector(state => state.walletData).block_height;

  const [selectedCoin, setSelectedCoin] = useState(null); // store selected coins shared_key_id
  const [selectedCoinTxData, setSelectedCoinTxData] = useState(DEFAULT_TX_DATA); // store selected coins shared_key_id

  const setSelectedCoinWrapper = (id) => {
    setSelectedCoin(id);
    if (id==null) {
      setSelectedCoinTxData(DEFAULT_TX_DATA)
    } else {
      setSelectedCoinTxData(callGetCoinBackupTxData(id))
    }
  }

  const copyBackupTxHexToClipboard = () => {
    navigator.clipboard.writeText(selectedCoinTxData.tx_backup_hex);
  }

  const copyPrivKeyToClipboard = () => {
    navigator.clipboard.writeText(selectedCoinTxData.priv_key_hex);
  }

  const copyKeyWIFToClipboard = () => {
    navigator.clipboard.writeText(selectedCoinTxData.key_wif);
  }

  return (
    <div className="container ">
        <div className="Body withdraw">
            <div className="swap-header">
                <h2 className="WalletAmount">
                    <img src={settings} alt="question"/>
                    Backup Transactions
                </h2>
                <div>
                    <Link className="nav-link" to="/settings">
                        <StdButton
                            label="Back"
                            className="Body-button transparent"/>
                    </Link>
                </div>
            </div>
            <h3 className="subtitle">Select StateCoin to view its backup transaction and associated private key</h3>
        </div>

        <div className="withdraw content">
            <div className="Body left ">
                <div>
                    <span className="sub">Click to select UTXO’s below</span>
                    <Coins
                      displayDetailsOnClick={false}
                      selectedCoin={selectedCoin}
                      setSelectedCoin={setSelectedCoinWrapper}/>
                </div>

            </div>
            <div className="Body right">
                <div className="header">
                    <h3 className="subtitle">Backup Transactions Details</h3>

                </div>

                <div>
                  <h3 className="subtitle">Blocks left:</h3>
                    <div className="">
                        <span>
                          {selectedCoinTxData.expiry_data.blocks}
                        </span>
                    </div>
                </div>

                <div>
                    <h3 className="subtitle">Days left:</h3>
                    <div className="">
                        <span>
                          {selectedCoinTxData.expiry_data.days}
                        </span>
                    </div>
                </div>

                <div>
                    <h3 className="subtitle">Months left:</h3>
                    <div className="">
                        <span>
                          {selectedCoinTxData.expiry_data.months}
                        </span>
                    </div>
                </div>

                <div>
                    <h3 className="subtitle">Hex:</h3>
                    <div className="">
                      <img type="button" src={icon2} alt="icon" onClick={copyBackupTxHexToClipboard}/>
                        <span>
                          {selectedCoinTxData.tx_backup_hex}
                        </span>
                    </div>
                </div>

                <div>
                    <h3 className="subtitle">Receive address Private Key:</h3>
                    <div className="">
                      <img type="button" src={icon2} alt="icon" onClick={copyPrivKeyToClipboard}/>
                        <span>
                          {selectedCoinTxData.priv_key_hex}
                        </span>
                    </div>
                </div>

                <div>
                    <h3 className="subtitle">Private Key WIF:</h3>
                    <div className="">
                      <img type="button" src={icon2} alt="icon" onClick={copyKeyWIFToClipboard}/>
                        <span>
                          {selectedCoinTxData.key_wif}
                        </span>
                    </div>
                </div>

            </div>
        </div>
    </div>
  )
}


export default withRouter(BackupTxPage);
