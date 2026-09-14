// Ballot contract deployed on Sepolia (see deployment.md)
export const BALLOT_ADDRESS = "0xA7814EdBdfB9C1BBd73620fb55F93375A403F6E3";

// Block the contract was deployed in, so event queries don't scan the chain from block 0.
// Update this together with BALLOT_ADDRESS after a redeploy.
export const BALLOT_DEPLOY_BLOCK = 11705053;

// ABI from the Hardhat build output; run `npx hardhat compile` in the project root first
export { abi as BALLOT_ABI } from "../../artifacts/contracts/Ballot.sol/Ballot.json";
