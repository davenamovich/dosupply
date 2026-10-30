import type { Product } from "./types";

/**
 * DEMO DATA — a simulated catalog for the sales-agent demo. None of these
 * availability, quantity or lead-time values come from DO Supply systems, and
 * no prices are included on purpose. Descriptions stay at product-family level.
 * Replace via the inventory provider chain in inventory.ts.
 */
const IMG = {
  plc: "/img/plc-module.png",
  hmi: "/img/hmi-terminal.png",
  drive: "/img/drive-unit.png",
  servo: "/img/servo-motor.png",
};

type Seed = Omit<Product, "id" | "demo" | "imageUrl"> & { img: keyof typeof IMG };

const SEEDS: Seed[] = [
  // Allen-Bradley
  { manufacturer: "Allen-Bradley", partNumber: "1756-L83E", name: "ControlLogix 5580 Controller", category: "PLC", description: "ControlLogix 5580 programmable automation controller.", availability: "In Stock", qtyAvailable: 4, relatedParts: ["1756-L83ES"], keywords: ["controllogix", "plc", "controller", "5580"], img: "plc" },
  { manufacturer: "Allen-Bradley", partNumber: "1756-L73", name: "ControlLogix 5570 Controller", category: "PLC", description: "ControlLogix 5570 programmable automation controller.", availability: "Limited", qtyAvailable: 2, possibleAlternative: { partNumber: "1756-L83E", note: "Newer ControlLogix generation. Compatibility must be verified by our team." }, keywords: ["controllogix", "plc", "controller", "5570"], img: "plc" },
  { manufacturer: "Allen-Bradley", partNumber: "1756-IB16", name: "ControlLogix 16-Point DC Input Module", category: "I/O Module", description: "ControlLogix digital DC input module.", availability: "In Stock", qtyAvailable: 12, keywords: ["controllogix", "input", "io", "i/o", "digital"], img: "plc" },
  { manufacturer: "Allen-Bradley", partNumber: "1769-L33ER", name: "CompactLogix 5370 Controller", category: "PLC", description: "CompactLogix 5370 programmable automation controller.", availability: "In Stock", qtyAvailable: 3, keywords: ["compactlogix", "plc", "controller", "5370"], img: "plc" },
  { manufacturer: "Allen-Bradley", partNumber: "2711P-T10C4D8", name: "PanelView Plus 7 Terminal (10 in.)", category: "HMI", description: "PanelView Plus 7 graphic operator terminal.", availability: "Lead Time", keywords: ["panelview", "hmi", "operator", "terminal", "touchscreen"], img: "hmi" },
  { manufacturer: "Allen-Bradley", partNumber: "25B-D010N104", name: "PowerFlex 525 AC Drive", category: "Drive / VFD", description: "PowerFlex 525 compact AC drive.", availability: "In Stock", qtyAvailable: 6, keywords: ["powerflex", "drive", "vfd", "inverter", "525"], img: "drive" },
  { manufacturer: "Allen-Bradley", partNumber: "1747-L542", name: "SLC 5/04 Processor", category: "PLC", description: "SLC 500 family processor. Legacy platform.", availability: "Obsolete / Sourcing", possibleAlternative: { partNumber: "1769-L33ER", note: "Common migration direction from SLC 500. Suitability must be confirmed by our team." }, keywords: ["slc", "slc 500", "plc", "processor", "legacy", "obsolete"], img: "plc" },
  { manufacturer: "Allen-Bradley", partNumber: "1785-L40B", name: "PLC-5/40 Processor", category: "PLC", description: "PLC-5 family processor. Legacy platform.", availability: "Obsolete / Sourcing", possibleAlternative: { partNumber: "1756-L83E", note: "Possible migration path. Our team must confirm any replacement." }, keywords: ["plc-5", "plc5", "processor", "legacy", "obsolete"], img: "plc" },
  // Siemens
  { manufacturer: "Siemens", partNumber: "6ES7315-2AH14-0AB0", name: "SIMATIC S7-300 CPU 315-2 PN/DP", category: "PLC", description: "SIMATIC S7-300 central processing unit.", availability: "Limited", qtyAvailable: 2, keywords: ["simatic", "s7-300", "plc", "cpu", "300"], img: "plc" },
  { manufacturer: "Siemens", partNumber: "6ES7214-1AG40-0XB0", name: "SIMATIC S7-1200 CPU 1214C", category: "PLC", description: "SIMATIC S7-1200 compact CPU.", availability: "In Stock", qtyAvailable: 5, keywords: ["simatic", "s7-1200", "plc", "cpu", "1200"], img: "plc" },
  { manufacturer: "Siemens", partNumber: "6ES7511-1AK02-0AB0", name: "SIMATIC S7-1500 CPU 1511-1 PN", category: "PLC", description: "SIMATIC S7-1500 CPU.", availability: "In Stock", qtyAvailable: 3, keywords: ["simatic", "s7-1500", "plc", "cpu", "1500"], img: "plc" },
  { manufacturer: "Siemens", partNumber: "6AV2123-2GB03-0AX0", name: "SIMATIC KTP700 Basic HMI", category: "HMI", description: "SIMATIC Basic Panel touch HMI.", availability: "Lead Time", keywords: ["simatic", "ktp700", "hmi", "panel", "touchscreen"], img: "hmi" },
  { manufacturer: "Siemens", partNumber: "6EP1334-3BA10", name: "SITOP PSU 24 V Power Supply", category: "Power Supply", description: "SITOP regulated 24 V DC power supply.", availability: "In Stock", qtyAvailable: 8, keywords: ["sitop", "power supply", "24v", "psu"], img: "plc" },
  // Mitsubishi
  { manufacturer: "Mitsubishi", partNumber: "FX3U-32MR/ES-A", name: "MELSEC FX3U Base Unit (32 I/O)", category: "PLC", description: "MELSEC FX3U relay-output base unit.", availability: "In Stock", qtyAvailable: 7, keywords: ["melsec", "fx3u", "plc", "base unit"], img: "plc" },
  { manufacturer: "Mitsubishi", partNumber: "Q03UDECPU", name: "MELSEC-Q Universal CPU", category: "PLC", description: "MELSEC-Q series universal model CPU with Ethernet.", availability: "Limited", qtyAvailable: 1, keywords: ["melsec", "q series", "plc", "cpu"], img: "plc" },
  { manufacturer: "Mitsubishi", partNumber: "MR-J4-40A", name: "MR-J4 Servo Amplifier", category: "Servo", description: "MELSERVO-J4 general-purpose interface servo amplifier.", availability: "In Stock", qtyAvailable: 4, keywords: ["melservo", "servo", "amplifier", "drive", "mr-j4"], img: "servo" },
  { manufacturer: "Mitsubishi", partNumber: "FR-D720-0.4K", name: "FR-D700 Inverter", category: "Drive / VFD", description: "FR-D700 series compact inverter.", availability: "Lead Time", keywords: ["inverter", "vfd", "drive", "fr-d700"], img: "drive" },
  // Omron
  { manufacturer: "Omron", partNumber: "CP1E-N40DR-A", name: "CP1E Compact PLC (40 I/O)", category: "PLC", description: "CP1E compact programmable controller.", availability: "In Stock", qtyAvailable: 9, keywords: ["cp1e", "plc", "compact"], img: "plc" },
  { manufacturer: "Omron", partNumber: "CJ2M-CPU31", name: "CJ2M CPU Unit", category: "PLC", description: "CJ2M series CPU unit.", availability: "Limited", qtyAvailable: 2, keywords: ["cj2m", "plc", "cpu"], img: "plc" },
  { manufacturer: "Omron", partNumber: "NX1P2-9024DT", name: "NX1P2 Machine Automation Controller", category: "PLC", description: "NX1P2 CPU unit with built-in I/O.", availability: "In Stock", qtyAvailable: 3, keywords: ["nx1p2", "plc", "controller"], img: "plc" },
  { manufacturer: "Omron", partNumber: "3G3MX2-A4015-V1", name: "MX2 Inverter", category: "Drive / VFD", description: "3G3MX2 series general-purpose inverter.", availability: "In Stock", qtyAvailable: 4, keywords: ["mx2", "inverter", "vfd", "drive"], img: "drive" },
  // Schneider Electric
  { manufacturer: "Schneider Electric", partNumber: "TM221CE24R", name: "Modicon M221 Logic Controller", category: "PLC", description: "Modicon M221 compact logic controller.", availability: "In Stock", qtyAvailable: 6, keywords: ["modicon", "m221", "plc", "controller"], img: "plc" },
  { manufacturer: "Schneider Electric", partNumber: "BMXP342020", name: "Modicon M340 CPU", category: "PLC", description: "Modicon M340 processor module.", availability: "Limited", qtyAvailable: 2, keywords: ["modicon", "m340", "plc", "cpu", "processor"], img: "plc" },
  { manufacturer: "Schneider Electric", partNumber: "ATV320U15N4B", name: "Altivar Machine ATV320 Drive", category: "Drive / VFD", description: "Altivar Machine ATV320 variable speed drive.", availability: "In Stock", qtyAvailable: 5, keywords: ["altivar", "atv320", "drive", "vfd", "inverter"], img: "drive" },
  // GE / Emerson
  { manufacturer: "GE/Emerson", partNumber: "IC693CPU374", name: "Series 90-30 CPU", category: "PLC", description: "GE Fanuc Series 90-30 CPU module.", availability: "Limited", qtyAvailable: 1, keywords: ["series 90-30", "90-30", "plc", "cpu", "ge fanuc"], img: "plc" },
  { manufacturer: "GE/Emerson", partNumber: "IC695CPU310", name: "PACSystems RX3i CPU", category: "PLC", description: "PACSystems RX3i controller CPU.", availability: "Lead Time", keywords: ["rx3i", "pacsystems", "plc", "cpu"], img: "plc" },
  { manufacturer: "GE/Emerson", partNumber: "IC693MDL645", name: "Series 90-30 16-Point Input Module", category: "I/O Module", description: "Series 90-30 24 V DC input module.", availability: "In Stock", qtyAvailable: 10, keywords: ["series 90-30", "90-30", "input", "io", "i/o"], img: "plc" },
  // Eaton
  { manufacturer: "Eaton", partNumber: "XV-102-B6-35TQR-10", name: "XV-102 Touchscreen HMI", category: "HMI", description: "Eaton XV-102 touchscreen operator panel.", availability: "In Stock", qtyAvailable: 3, keywords: ["xv102", "xv-102", "hmi", "touchscreen", "panel"], img: "hmi" },
  { manufacturer: "Eaton", partNumber: "ELC-PB14NNDR", name: "ELC Programmable Logic Controller", category: "PLC", description: "Eaton ELC series PLC base unit.", availability: "Limited", qtyAvailable: 2, keywords: ["elc", "plc", "controller"], img: "plc" },
];

export const DEMO_PRODUCTS: Product[] = SEEDS.map(({ img, ...p }) => ({
  ...p,
  id: `demo-${p.partNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  imageUrl: IMG[img],
  demo: true,
}));
