# Deployments

## ElectionFactory (Sepolia)

- Address: 0xdeA2C4b34f3bd46c4BB82a36DDFd22671BC17352
- Deployment block: 11778467
- Deployed: 2026-09-25
- Owner: 0xE3EaA450FF67B86B0bE8e9D83460D5fF5E0F3bb3
- Creation transaction: 0x6cebf6b4c7dd815f8c21caf8d99faba12b5265649f9d6125a10d9300f222e9bb

Individual elections are deployed by the factory through `createElection()`. Their addresses
come from the `ElectionCreated` event and are listed by `getElections()`, so they are not
recorded here. The frontend reads the factory address and deployment block from
`frontend/src/contract.js`.

## Earlier deployments

Single `Ballot` contracts from before the factory, kept for reference. All are superseded.

- 0x34BAf220e426dD2Dacd7FEa9E74a835c89aF5a58 (throwaway, used for the demo video)
- 0x4894b986e30F2fE3043c5A7980Ee98867f38CB65
- 0xA7814EdBdfB9C1BBd73620fb55F93375A403F6E3
- 0xfc4f8F53F620C80713bc996eebFd01b0D6a25f7f
- 0x3552B238312fa7E1B1a98b8dF2C0E0aa465698B8
