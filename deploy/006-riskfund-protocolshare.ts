import * as ERC20 from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { getConfig, getTokenConfig } from "../helpers/deploymentConfig";
import { convertToUnit } from "../helpers/utils";

const MIN_AMOUNT_TO_CONVERT = convertToUnit(10, 18);
const MIN_POOL_BAD_DEBT = convertToUnit(1000, 18);
const maxLoopsLimit = 150;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const { tokensConfig } = await getConfig(hre.network.name);
  const usdtConfig = getTokenConfig("USDT", tokensConfig);

  let USDT;
  if (usdtConfig.isMock) {
    USDT = await ethers.getContract("MockUSDT");
  } else {
    USDT = await ethers.getContractAt(ERC20.abi, usdtConfig.tokenAddress);
  }

  const swapRouter = await ethers.getContract("SwapRouter");
  const accessControl = await ethers.getContract("AccessControlManager");

  await deploy("RiskFund", {
    from: deployer,
    contract: "RiskFund",
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [swapRouter.address, MIN_AMOUNT_TO_CONVERT, USDT.address, accessControl.address, maxLoopsLimit],
      },
      upgradeIndex: 0,
    },
    autoMine: true,
    log: true,
  });

  const riskFund = await ethers.getContract("RiskFund");

  const shortfallDeployment = await deploy("Shortfall", {
    from: deployer,
    contract: "Shortfall",
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [riskFund.address, MIN_POOL_BAD_DEBT, accessControl.address],
      },
      upgradeIndex: 0,
    },
    autoMine: true,
    log: true,
  });

  const tx = await riskFund.setShortfallContractAddress(shortfallDeployment.address);
  await tx.wait(1);

  await deploy("ProtocolShareReserve", {
    from: deployer,
    contract: "ProtocolShareReserve",
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [deployer, riskFund.address],
      },
      upgradeIndex: 0,
    },
    autoMine: true,
    log: true,
  });
};
func.tags = ["RiskFund", "il"];

export default func;
