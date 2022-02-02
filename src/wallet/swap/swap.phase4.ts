// Logger import.
import { SwapStep, SWAP_STATUS } from "./swap_utils";
import { STATECOIN_STATUS } from "..";
import Swap from "./swap"


export function swapPhase4(swap: Swap): SwapStep[] {
    return [
    new SwapStep(
        SWAP_STATUS.Phase4, "swapPhase4PollSwap",
        () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
        () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase4 },
        () => { 
          if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
          if (swap.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
          if (swap.statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.");
          return true
        },
        swap.swapPhase4PollSwap
      ),
      new SwapStep(
        SWAP_STATUS.Phase4, "transferReceiverFinalize",
        () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
        () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase4 },
        () => { 
          if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
          if (swap.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
          if (swap.statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.");
          return true
        },
        swap.transferReceiverFinalize
      )
    ]
}