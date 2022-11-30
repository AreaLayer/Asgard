import React, { useState, useEffect } from 'react';
import CopiedButton from '../CopiedButton';
import QRCode from 'qrcode.react';
import './DepositToken.css';
import arrow from "../../images/arrow-up.png";
import { useDispatch, useSelector } from 'react-redux';
import { fromSatoshi } from '../../wallet';
import QRCodeGenerator from '../QRCodeGenerator/QRCodeGenerator';
import { setToken } from '../../features/WalletDataSlice';
import close_img from "../../images/close-icon.png";
import { DUST_LIMIT } from '../../wallet/util';


// Add Animation for when button clicked

const DepositToken = ({ token = "", confirmDelete = () => {} }) => {
    const dispatch = useDispatch();
    const { fee_info, token_verify } = useSelector((state) => state.walletData);

    const [showAddress, setShowAddress] = useState(false);
    const [address, setAddress] = useState({addr: "", type: ""})
    const [tokenFee, setTokenFee] = useState("") // sum of values multiplied by fee_info.deposit
    const [refresh, setRefresh] = useState();

    useEffect(()=> {

        if( tokenFee === "" ){
            let fee_amount = token.values.reduce((partialSum, a) => partialSum + a, 0) * fee_info.deposit/10000

            setTokenFee(fee_amount)
        }

    },[tokenFee])


    const totalStatecoinCount = (valuesArray) => {
        // Returns Obj of key - statecoin amount and value - statecoin frequency
        const counts = {};

        for (const num of valuesArray) {
        counts[num] = counts[num] ? counts[num] + 1 : 1;
        }

        return counts
    }

    const copyAddressToClipboard = (e) => {
        navigator.clipboard.writeText(address.addr);
    }

    const onHandleClick = (e) => {

        if(e.target.innerHTML.includes("BTC")){
            setAddress({addr: token.token.btc, type: "btc"})
            setShowAddress(true)
        }
        if(e.target.innerHTML.includes("LN")){
            setAddress({addr: token.token.ln, type: "ln"})
            setShowAddress(true)
        }
    }

    const handleConfirm = () => {

        if(token_verify.status === "idle"){
            dispatch(setToken(token))
        }
    }

    
    return(
    <div className="token-deposit receiveStatecoin content">
        <div className="Body">
            <div className="Body-button expired">
                <img className='close' src={close_img} alt="arrow" onClick={() => confirmDelete(token.token.id)} />
            </div>
            <div className="body-title">
                <span className="title">
                    <h1 className="receive-note">Deposit Token</h1>
                    <p>Send {fromSatoshi(tokenFee)} BTC to an address below</p>
                </span>
                <span className='token-amount'>
                    <h1 className="receive-note amount">{fromSatoshi(tokenFee)} BTC</h1>
                </span>
            </div>
            <div className = 'coin-count-display'>
                {Object.entries(totalStatecoinCount(token.values)).map(([key,value]) => {
                    return(
                        <p key = {key} className = 'coin-count' >{value} x {fromSatoshi(key)} BTC</p>
                    )
                })}
            </div>

            {showAddress? 
            (
            <div className='back-select'>
                <button
                    type="button"
                    className="Body-button transparent left"
                    onClick={() => setShowAddress(false)}>
                    <img src={arrow} alt="arrow" />
                </button>
            </div>):(null)}

            {showAddress? (
            <div className="receiveStatecoin-scan">
                <div className="receive-qr-code">
                    
                {address.type === "btc" ? 
                (<QRCodeGenerator address={address.addr} amount={tokenFee}/>)
                :
                (<QRCode value={(address.addr).toUpperCase()} />)}
                </div>
                <div className="receiveStatecoin-scan-content">
                    <div className="receiveStatecoin-scan-txid">
                        <CopiedButton
                        handleCopy={copyAddressToClipboard}
                        style={{
                            bottom: '-30px',
                            top: 'initial',
                            backgroundColor: 'var(--button-border)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: 'var(--text-primary)',
                            fontWeight: 'bold'
                        }}
                        message='Copied to Clipboard'
                        className={"copy-btn-wrap"}
                        >
                            <div className="address-index">
                                <div className="address">
                                    <span className="rec-address">
                                        {tokenFee === 0 ? (
                                            "Go Back - Select statecoin values"
                                        ):(address.addr)}
                                    </span>
                                </div>
                                <div className="info-receive">
                                    <div className="info-container">
                                        <span className="tooltip-info index">
                                            <div>Token Deposit</div>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CopiedButton>
                    </div>
                </div>
            </div>):(
                <div className='pay-select'>
                    { tokenFee > DUST_LIMIT ? (
                    <button className='Body-button token' onClick={(e) => onHandleClick(e)}>
                        <p>BTC</p>
                    </button>
                    ): (null)}
                    <button className='Body-button token' onClick={(e) => onHandleClick(e)}>
                        <p>LN</p>
                    </button>
                </div>
            )}
            <div>
                <button className = 'Body-button verify-token' onClick = {handleConfirm}>
                    Confirm Token
                </button>
            </div>
        </div>
      </div>
    )
}

export default DepositToken;