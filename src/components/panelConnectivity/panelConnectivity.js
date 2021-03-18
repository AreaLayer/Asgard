import arrow from '../../images/arrow-accordion.png';

import React, {useState} from "react";
import {useSelector} from 'react-redux'

import { callGetBlockHeight, callGetConfig } from '../../features/WalletDataSlice'
import { defaultWalletConfig } from '../../containers/Settings/Settings'

import './panelConnectivity.css';
import '../index.css';


const PanelConnectivity = (props) => {
  // Arrow down state
  const [state, setState] = useState({isToggleOn: false});
  const toggleContent = (event) => {
      setState({isToggleOn: !state.isToggleOn})
  }

  let current_config;
  try {
    current_config = callGetConfig();
  } catch {
    current_config = defaultWalletConfig()
  }

  const fee_info = useSelector(state => state.walletData).fee_info;
  const block_height = callGetBlockHeight();

  return (
      <div className="Body small accordion">
          <div className="Collapse">
              <div className="ConnectionStateChain">
                  <label>
                      <input
                          readOnly
                          type="radio"
                          value="StateChain"
                          checked={fee_info.deposit !== "NA"}
                      />
                      Connected to Server
                      <span className="checkmark"></span>
                  </label>
              </div>
              <div className="ConnectionSwaps">
                  <label>
                      <input
                        readOnly
                        type="radio"
                        value="Swaps"
                        checked={false}
                      />
                      Connected to Swaps
                      <span className="checkmark"></span>
                  </label>
              </div>
              <div onClick={toggleContent} className={state.isToggleOn ? "image rotate" : ' image '}>
                  <img src={arrow} alt="arrowIcon"/>
              </div>
          </div>

        <div className={state.isToggleOn ? "show" : ' hide'}>
            <div className="collapse-content">
                <div className="collapse-content-item">
                    <span>Block height: {block_height}</span>
                    <span>Host: {current_config.electrum_config.host}</span>
                    <span>Port: {current_config.electrum_config.port}</span>
                    <span>Protocol: {current_config.electrum_config.protocol}</span>
                    <span>{fee_info.endpoint}</span>
                    <div>
                    <span className="txt">Deposit Fee: <b>{fee_info.deposit /10000}%</b></span>
                    <span className="txt">Withdraw Fee: <b>{fee_info.withdraw/10000}%</b></span>
                </div>
                </div>

                  <div className="collapse-content-item">
                      <span>xxx.xxx.x.xx</span>
                      <div>
                          <span className="txt">Pending Swaps: <b>NA</b></span>
                          <span className="txt">Participants: <b>NA</b></span>
                          <span className="txt">Total pooled BTC: <b>NA</b></span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}

export default PanelConnectivity;
