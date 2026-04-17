const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const DWT = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", "0xe149b32b97384131204C86a23459b544498BC46A");
  const bal = await DWT.balanceOf(deployer.address);
  console.log("DWT Balance:", hre.ethers.formatEther(bal));
}

main().catch(console.error);
