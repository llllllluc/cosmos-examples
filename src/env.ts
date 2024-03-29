import dotenv from "dotenv";
import { env } from "process";

dotenv.config();

export const LCD_ENDPOINT: string = env.LCD_ENDPOINT!;
export const WEBSOCKET_ENDPOINT: string = env.WEBSOCKET_ENDPOINT!;
export const CHAIN_ID: string = env.CHAIN_ID!;
export const CHAIN_PREFIX: string = env.CHAIN_PREFIX!;
export const CHAIN_DENOM: string = env.CHAIN_DENOM!;

export const VALIDATOR_ADDRESS: string = env.VALIDATOR_ADDRESS!;

export const TESTER1_MNEMONIC_KEY: string = env.TESTER1_MNEMONIC_KEY!;
export const TESTER2_MNEMONIC_KEY: string = env.TESTER2_MNEMONIC_KEY!;
export const TESTER3_MNEMONIC_KEY: string = env.TESTER3_MNEMONIC_KEY!;

export const DEFAULT_TESTER_ID: number = parseInt(env.DEFAULT_TESTER_ID!);

export const IS_COIN_TYPE_118: boolean = env.IS_COIN_TYPE_118! === "true";

export const ENABLE_SKIP: boolean = env.ENABLE_SKIP === "true";
export const SKIP_RPC_ENDPOINT: string | undefined = env.SKIP_RPC_ENDPOINT;

export const WARP_CONTROLLER_ADDRESS: string | undefined = env.WARP_CONTROLLER_ADDRESS;
export const WARP_RESOLVER_ADDRESS: string | undefined = env.WARP_RESOLVER_ADDRESS;

export const ENTERPRISE_FACTORY_ADDRESS: string | undefined = env.ENTERPRISE_FACTORY_ADDRESS;
export const ENTERPRISE_DAO_ADDRESS: string | undefined = env.ENTERPRISE_DAO_ADDRESS;

export const ASTRO_LUNA_PAIR_ADDRESS: string | undefined = env.ASTRO_LUNA_PAIR_ADDRESS;
export const NTRN_USDC_PAIR_ADDRESS: string | undefined = env.NTRN_USDC_PAIR_ADDRESS;
export const ASTRO_TOKEN_ADDRESS: string | undefined = env.ASTRO_TOKEN_ADDRESS;
export const ASTROPORT_ROUTER_ADDRESS: string | undefined = env.ASTROPORT_ROUTER_ADDRESS;

export const MARS_RED_BANK_ADDRESS: string | undefined = env.MARS_RED_BANK_ADDRESS;
export const OSMOSIS_SWAPPER_BY_MARS: string | undefined = env.OSMOSIS_SWAPPER_BY_MARS;

export const USDC_DENOM: string | undefined = env.USDC_DENOM;

export const PYTH_ADDRESS: string | undefined = env.PYTH_ADDRESS;
