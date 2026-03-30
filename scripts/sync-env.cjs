const { ethers } = require('hardhat')
require('dotenv').config()
const fs = require('fs')
const path = require('path')

async function main() {
  // These are from my previous successful L1 run logs
  const l1 = {
    DWT_TOKEN: '0xEF2088b398df9819777176E36a3d0530705f9',
    TIMELOCK: '0x5317Af0e2f442254c45d6f2E3faF2577B0824870',
    GOVERNOR: '0x229418e244CB91b1FdF87a8679A89D227d113b6A',
    TREASURY: '0xf88A7A41b5031D9f14f1C57eDf2706F1E6E34c01', // I need to verify this or find it
    DWTPAYMASTER: '0xbEb3806fA2906C1410006072Ee1aA633435c14', // Need to find
    DWTETHRATEFEED: '0xF240F78086abc6d3312bd61f13f6F2f5E37eb285', // Need to find
  }

  // Since I can't be sure of the ones I didn't log well, I'll just check the most recent ones
  // Or better, I'll just re-run the L2/L3 with fixed ENV values.
}
