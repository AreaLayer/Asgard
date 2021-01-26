import React, {useEffect} from 'react';
import { withRouter } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux'

import { PanelControl, PanelConnectivity, PanelCoinsActivity } from '../../components'
import { refreshCoinData, callGetFeeInfo } from '../../features/WalletDataSlice'

const HomePage = () => {
  const dispatch = useDispatch();

  // Refresh Coins list
  useEffect(() => {
    dispatch(refreshCoinData())
  })

  return (
    <div className="container home-page">
      <PanelControl />
      <PanelConnectivity />
      <PanelCoinsActivity />
    </div>
  )
}

export default withRouter(HomePage);
