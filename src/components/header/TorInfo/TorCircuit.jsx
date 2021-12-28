/* 
    TODO - see if you can optimize the useEffect call
    clean up the render method
    see why relay nodes and onion addresses render before the circuit nodes
    put real onion address for the onion address

    CHECK - why clicking new circuit is not always instant -> async
*/

import React,  {useEffect, useState} from 'react'
import {useDispatch} from 'react-redux';
import { callGetNewTorId, callGetTorcircuitInfo, callUpdateTorCircuit } from '../../../features/WalletDataSlice';
import './torCircuit.css'
import TorCircuitNode from './TorCircuitNode'
import {callGetConfig} from '../../../features/WalletDataSlice'
import {defaultWalletConfig} from '../../../containers/Settings/Settings'
import { Loading } from '../..';


const TorCircuit = (props) => {

    const dispatch = useDispatch();

    const [torLoaded, setTorLoaded] = useState(false);
    const [torcircuitData, setTorcircuitData] = useState([]);
    // const [loading, setLoading] = useState(false)

    let current_config;
    try {
      current_config = callGetConfig();
    } catch {
      current_config = defaultWalletConfig()
    }


    const getTorCircuitInfo = () => {
        dispatch(callUpdateTorCircuit());
        let torcircuit_data = callGetTorcircuitInfo();
        let torcircuit_array = torcircuit_data ? torcircuit_data : [];
        setTorLoaded(torcircuit_data.length > 0)
        setTorcircuitData(torcircuit_array);
    }

    useEffect(() => {
        const interval = setInterval(() => {       
            getTorCircuitInfo();
        }, 3000);
        return () => {
            clearInterval(interval);
        }
    }, [dispatch, torLoaded]);
    
    // useEffect(() => {
    //     if(loading === true){
    //         const interval = setInterval(() => {
    //             setLoading(false)
    //         }, 3000);
    //         return () => clearInterval(interval);
    //     }
    // }, [torcircuitData]);

    const newCircuit = () => {
        dispatch(callGetNewTorId()).then(() => {
            getTorCircuitInfo();
        });
    }


    function shortenURL(url){
        let shortURL = ""
        
        url = url.replace("http://","")
        shortURL = shortURL.concat(url.slice(0,3),"...",url.slice(url.length-8,url.length))
        
        return shortURL
    }

    return (
        <div class="dropdown tor">
            <TorIcon/>
            <div class="dropdown-content">
                { torLoaded ? ( 
                <div>
                    <ul>
                        <TorCircuitNode class='passed' name='Mercury Wallet'></TorCircuitNode>
                        {torcircuitData.map((circuit, index) => {
                            if(circuit.ip === "") return
                            return <TorCircuitNode className='passed' name={circuit.country} ip={circuit.ip} key ={circuit.ip}></TorCircuitNode>
                        })}
                        {/* <TorCircuitNode className='current' name={current_config.state_entity_endpoint}></TorCircuitNode> */}
                        {<TorCircuitNode class='current' name={shortenURL(current_config.state_entity_endpoint)}></TorCircuitNode>}
                    </ul>
                    <button class='Body-button' onClick={newCircuit}>New Circuit</button>
                </div>) :  
                (<div>
                    <p>Couldn't establish connection to tor</p>
                </div> )
                }
            </div>
        </div>
    )
}

export const TorIcon = () => (
<svg width="24px" height="24px" viewBox="0 0 512 512 " version="1.1" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient x1="50%" y1="100%" x2="50%" y2="0%" id="linearGradient-1">
            <stop stopColor="white" offset="0%"></stop>
            <stop stopColor="white" offset="100%"></stop>
        </linearGradient>
        <path d="M25,29 C152.577777,29 256,131.974508 256,259 C256,386.025492 152.577777,489 25,489 L25,29 Z" id="path-2"></path>
        <filter x="-18.2%" y="-7.4%" width="129.4%" height="114.8%" filterUnits="objectBoundingBox" id="filter-3">
            <feOffset dx="-8" dy="0" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
            <feGaussianBlur stdDeviation="10" in="shadowOffsetOuter1" result="shadowBlurOuter1"></feGaussianBlur>
            <feColorMatrix values="0 0 0 0 0.250980392   0 0 0 0 0.250980392   0 0 0 0 0.250980392  0 0 0 0.2 0" type="matrix" in="shadowBlurOuter1"></feColorMatrix>
        </filter>
    </defs>
    <g id="tor-browser-icon" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g id="icon_512x512">
            <g id="Group">
                <g id="tb_icon/Stable">
                    <g id="Stable">
                        <circle id="background" fill="none" fillRule="nonzero" cx="256" cy="256" r="246"></circle>
                        <path d="M256.525143,465.439707 L256.525143,434.406609 C354.826191,434.122748 434.420802,354.364917 434.420802,255.992903 C434.420802,157.627987 354.826191,77.8701558 256.525143,77.5862948 L256.525143,46.5531962 C371.964296,46.8441537 465.446804,140.489882 465.446804,255.992903 C465.446804,371.503022 371.964296,465.155846 256.525143,465.439707 Z M256.525143,356.820314 C311.970283,356.529356 356.8487,311.516106 356.8487,255.992903 C356.8487,200.476798 311.970283,155.463547 256.525143,155.17259 L256.525143,124.146588 C329.115485,124.430449 387.881799,183.338693 387.881799,255.992903 C387.881799,328.654211 329.115485,387.562455 256.525143,387.846316 L256.525143,356.820314 Z M256.525143,201.718689 C286.266674,202.00255 310.3026,226.180407 310.3026,255.992903 C310.3026,285.812497 286.266674,309.990353 256.525143,310.274214 L256.525143,201.718689 Z M0,255.992903 C0,397.384044 114.60886,512 256,512 C397.384044,512 512,397.384044 512,255.992903 C512,114.60886 397.384044,0 256,0 C114.60886,0 0,114.60886 0,255.992903 Z" id="center" fill="url(#linearGradient-1)"></path>
                        <g id="half" transform="translate(140.500000, 259.000000) scale(-1, 1) translate(-140.500000, -259.000000) ">
                            <use fill="black" fillOpacity="1" filter="url(#filter-3)" ></use>
                            <use fill="url(#linearGradient-1)" fillRule="evenodd" ></use>
                        </g>
                    </g>
                </g>
            </g>
        </g>
    </g>
</svg>

);

  
export default TorCircuit