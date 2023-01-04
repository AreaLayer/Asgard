import PageHeader from "../PageHeader/PageHeader";
import { useState } from "react";

import CoinDescription from "../../components/inputs/CoinDescription/CoinDescription";

import plus from "../../images/plus-deposit.png";
import btc_img from "../../images/icon1.png";
import arrow_img from "../../images/scan-arrow.png";
import copy_img from "../../images/icon2.png";

import { CopiedButton, AddressInput } from "../../components";
import { fromSatoshi } from "../../wallet";

import './DepositLightning.css';



const DepositLightning = (props) => {

    const [inputAmt, setInputAmt] = useState("");

    const [inputDes, setInputDes] = useState("");

    const [inputNodeId, setInputNodeId] = useState("");

    const [invoice, setInvoice] = useState({});

    const onInputAmtChange = (event) => {
        setInputAmt(event.target.value);
    };
  
    const onInputDesChange = (event) => {
        setInputDes(event.target.value);
    };

    const onInputNodeIdChange = (event) => {
        setInputNodeId(event.target.value);
    };

    const createChannel = () => {
        let newInvoice = { amt: inputAmt, desc: inputDes, addr: "bc1qjfyxceatrh04me73f67sj7eerzx4qqq4mewscs" };
        setInvoice(newInvoice);
        setInputAmt("");
        setInputDes("");
        setInputNodeId("");
      }

    return (
        <div className = "container deposit-ln">
            <PageHeader 
                title = "Create Channel"
                className = "create-channel"
                icon = {plus}
                subTitle = "Deposit BTC in channel to a Bitcoin address" />
            {invoice && Object.keys(invoice).length ? 
                <div className="Body">
                    <div className="deposit-scan">
            
                    <div className="deposit-scan-content">
                        <div className="deposit-scan-subtxt">
                            <span>{invoice.desc}</span>
                        </div>
            
                        <div className="deposit-scan-main">
                            <div className="deposit-scan-main-item">
                                <img src={btc_img} alt="icon" />
                                <span><b>{invoice.amt}</b> BTC</span>
                            </div>
                        <img src={arrow_img} alt="arrow" />
                        <div className="deposit-scan-main-item">

                            <>
                                <CopiedButton handleCopy={ () => {} }>
                                    <img type="button" src={copy_img} alt="icon" />
                                </CopiedButton>
                                <span className="long"><b>bc1qjfyxceatrh04me73f67sj7eerzx4qqq4mewscs</b></span>
                            </>
                        </div>
                        </div>
            
                    </div>
                    </div>
                    <span className="deposit-text">Create funding transaction by sending {invoice.amt} BTC to the above address in a SINGLE transaction</span>
                </div>
                : null
            }

            <div className="withdraw content lightning">
              <div className="Body right lightning">
                  <div className="header">
                      <h3 className="subtitle">Payee Details</h3>
                  </div>


                  <div>
                      <AddressInput
                        inputAddr={inputAmt}
                        onChange={onInputAmtChange}
                        placeholder='Enter amount'
                        smallTxtMsg='Amount in BTC'/>
                  </div>
                  <div>
                      <AddressInput
                        inputAddr={inputDes}
                        onChange={onInputDesChange}
                        placeholder='Description'
                        smallTxtMsg='Description'/>
                  </div>
                  <div>
                      <AddressInput
                        inputAddr={inputNodeId}
                        onChange={onInputNodeIdChange}
                        placeholder='Node ID'
                        smallTxtMsg='Node ID'/>
                  </div>

                  <div>
                    <button type="button" className={`btn withdraw-button `} onClick={createChannel}>
                        Create Channel </button>
                  </div>
              </div>
          </div>
        </div>
    )
}

export default DepositLightning;
  