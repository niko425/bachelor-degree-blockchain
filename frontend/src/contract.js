// Ballot contract deployed on Sepolia (see deployment.md)
export const BALLOT_ADDRESS = "0xfc4f8F53F620C80713bc996eebFd01b0D6a25f7f";

// Block the contract was deployed in, so event queries don't scan the chain from block 0.
// Update this together with BALLOT_ADDRESS after a redeploy.
export const BALLOT_DEPLOY_BLOCK = 11698535;

// ABI from the Hardhat build output; run `npx hardhat compile` in the project root first
export { abi as BALLOT_ABI } from "../../artifacts/contracts/Ballot.sol/Ballot.json";
