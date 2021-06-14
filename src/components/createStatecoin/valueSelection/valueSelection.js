import React, {useState, useRef} from 'react';
import { Modal } from 'react-bootstrap';

import { fromSatoshi } from '../../../wallet/util'

import '../../../containers/Deposit/Deposit.css';

const ValueSelectionPanel = (props) => 
    const [selected, setSelected] = useState(props.selectedValue);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customDeposit, setCustomDeposit] = useState({
      liquidity: 0,
      value: 0,
      liquidityLabel: 'Other',
      customInput: true
    });
    const customInputRef = useRef()
    const [selected, setSelected] = useState(null);

    const selectValue = (value) => {
      if (value !== selected) {
        setSelected(value);
        props.addValueSelection(props.id, value)
        return
      }
      setSelected(null);
      props.addValueSelection(props.id, null)
    }

    let coinsLiquidityData = props.coinsLiquidityData.slice(0, props.coinsLiquidityData.length -1);
    if(customDeposit.value) {
      coinsLiquidityData = [
        ...coinsLiquidityData,
        customDeposit
      ]
    }

    const handleClose = () => setShowCustomInput(false);
    const handleConfirm = () => {
      const customValue = customInputRef.current.value;
      setCustomDeposit({
        ...customDeposit,
        value: customValue
      });
      selectValue(customValue);
      setShowCustomInput(false);
      
    }

    const populateValueSelections = coinsLiquidityData.map((item, index) => {
        return (
          <div key={index} className={`numbers-item ${selected == item.value ? 'selected-value' : ''}`}>
            {selected === item.value && (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 14C4.69159 14 2 11.3084 2 8C2 4.69159 4.69159 2 8 2C11.3084 2 14 4.69159 14 8C14 11.3084 11.3084 14 8 14ZM4.64603 7.15381L4.64602 7.15382L3.79984 8.00001L6.80011 11.0003L12.2002 5.60023L11.354 4.7481L6.8001 9.30197L4.64602 7.15383L4.64603 7.15381Z" fill="#0054F4" />
            </svg>)}
            <ValueSelection
              value={item.value}
              liquidity={item.liquidity}
              liquidityLabel={item.liquidityLabel}
              selected={selected}
              selectValue={selectValue}/>
          </div>
        )
      });

    return (
      <div className="Body">
          <div className="deposit-main">
              <span>Select Statecoin Value</span>
              <div className="deposit-statecoins">
                <div className="numbers">
                  {populateValueSelections}
                  {customDeposit.value === 0 && (
                    <div className="numbers-item" onClick={() => setShowCustomInput(true)}>
                      <span className="custom-deposit-btn"><b>Other</b></span>
                      <div className="progress">
                        <div className="fill" style={{width: '0%'}}></div>
                      </div>
                      <span color="#757575">Select Value</span>
                    </div>
                  )}
                </div>
              </div>
          </div>
          <Modal show={showCustomInput} onHide={handleClose} className="modal">
            <Modal.Body className="custom-modal-body">
              <div className="selected-item">
                <span>Custom Value</span>
                <input type="number" className="custom-smallest" ref={customInputRef} />
              </div>
            </Modal.Body>
            <div className="custom-modal-footer group-btns">
              <button className="primary-btn ghost" onClick={handleClose}>
                Cancel
              </button>
              <button className="primary-btn blue" onClick={handleConfirm}>
                Confirm
              </button>
            </div>
          </Modal>
      </div>
    )
}

const getPercentByLabel = (label) => {
  switch (label) {
    case 'Low':
      return 33;
    case 'Med':
      return 66;
    case 'High':
      return 100;
    default:
      return 0;
  }
};

const ValueSelection = (props) => {

    return (
      <div
        onClick={() => props.selectValue(props.value)}
      >
          <span><b>{fromSatoshi(props.value)}</b> BTC</span>
          <div className="progress">
            <div className={`fill`} style={{width: `${getPercentByLabel(props.liquidityLabel)}%`}}></div>
          </div>
          <span>Liquidity: <b>{props.liquidityLabel}</b></span>
      </div>
    )
}

export default ValueSelectionPanel;
