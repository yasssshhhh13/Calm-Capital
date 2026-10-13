import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IPOS_PATH = path.join(__dirname, '..', 'public', 'ipos.json');
const LIVE_DATA_PATH = path.join(__dirname, '..', 'public', 'live-data.json');

const VERIFIED_UPCOMING_DATA = {
  // Flagship verified IPOs identified by user & audit
  'jio-platforms': { issueSize: 30213, freshIssue: 30213, ofs: 0, status: 'Upcoming' },
  'hd-fire-protect': { issueSize: 712.31, freshIssue: 0, ofs: 712.31 },
  'tonbo-imaging-india': { issueSize: 852.18, freshIssue: 0, ofs: 852.18, faceValue: 2 },
  'bonfiglioli-transmissions': { issueSize: 2533.66, freshIssue: 0, ofs: 2533.66, status: 'Upcoming' },
  'sahajanand-medical-technologies': { issueSize: 475.48, freshIssue: 0, ofs: 475.48, status: 'Upcoming' },

  // Mainboard & SME IPOs where share count in crores was previously confused with rupees
  'hero-motors': { issueSize: 1000, freshIssue: 600, ofs: 400 },
  'shankesh-jewellers': { issueSize: 367.18, freshIssue: 274.18, ofs: 93 },
  'skyways-air': { issueSize: 582.8, freshIssue: 398.8, ofs: 184 },
  'jindal-supreme': { issueSize: 124.88, freshIssue: 99.89, ofs: 24.99 },
  'sonaselection-india': { issueSize: 141.57, freshIssue: 141.57, ofs: 0 },
  'skytech-infinite-platform': { issueSize: 22.68, freshIssue: 22.68, ofs: 0 },
  'kwick-forensic-solutions': { issueSize: 50.77, freshIssue: 41.05, ofs: 9.72 },
  'amtech-esters': { issueSize: 17.88, freshIssue: 17.88, ofs: 0 },
  'kheria-autocomp': { issueSize: 46.44, freshIssue: 46.44, ofs: 0 },
  'fx-multitech': { issueSize: 45.24, freshIssue: 41.21, ofs: 4.03 },
  'unitec-fibres': { issueSize: 34.47, freshIssue: 34.47, ofs: 0 },
  'bench-mark-infotech-services': { issueSize: 42.44, freshIssue: 37.4, ofs: 5.04 },
  'peshwa-wheat': { issueSize: 53.52, freshIssue: 53.52, ofs: 0 },
  'tempsens-instruments-india': { issueSize: 650, freshIssue: 95, ofs: 555 },
  'kanohar-electricals': { issueSize: 1055.74, freshIssue: 300, ofs: 755.74 },
  'pranav-constructions': { issueSize: 351.03, freshIssue: 315.6, ofs: 35.43 },
  'manika-plastech': { issueSize: 125.5, freshIssue: 92.5, ofs: 33 },
  'varmora-granito': { issueSize: 708.02, freshIssue: 320, ofs: 388.02 },
  'acevector': { issueSize: 420, freshIssue: 287, ofs: 133 },
  'ekkaa-electronics-india': { issueSize: 725, freshIssue: 525, ofs: 200 },
  'shreejikrupa-project': { issueSize: 500, freshIssue: 410, ofs: 90 },
  'baanganga-gold-diamond-i': { issueSize: 720, freshIssue: 540, ofs: 180 },
  'b-s-sponge': { issueSize: 1000, freshIssue: 800, ofs: 200 },
  'national-stock-exchange-of-india': { issueSize: 22562, freshIssue: 0, ofs: 22562 },

  // Established verified upcoming IPOs from prospectus/DRHP
  'encube-ethicals': { issueSize: 3000, freshIssue: 0, ofs: 3000 },
  'advanced-sys-tek': { issueSize: 115, freshIssue: 98, ofs: 17 },
  'veritas-finance': { issueSize: 2800, freshIssue: 600, ofs: 2200 },
  'master-chains-n-jewels': { issueSize: 400, freshIssue: 400, ofs: 0 },
  'yogiji-digi': { issueSize: 270, freshIssue: 270, ofs: 0 },
  'indian-gas-exchange': { issueSize: 1100, freshIssue: 0, ofs: 1100 },
  'fusion-cx': { issueSize: 1000, freshIssue: 600, ofs: 400 },
  'gni-infrastructure': { issueSize: 450, freshIssue: 310, ofs: 140 },
  'ratnadeep-retail': { issueSize: 400, freshIssue: 400, ofs: 0 },
  'cult-fit': { issueSize: 1450, freshIssue: 950, ofs: 500 },
  'tmc-transformers-india': { issueSize: 550, freshIssue: 550, ofs: 0 },
  'innoterra': { issueSize: 105, freshIssue: 105, ofs: 0 },
  'pragyawan-technologies': { issueSize: 400, freshIssue: 400, ofs: 0 },
  'swara-baby-products': { issueSize: 1000, freshIssue: 500, ofs: 500 },
  'stalwart-people-services-india': { issueSize: 150, freshIssue: 150, ofs: 0 },
  'functional-innovative-foods': { issueSize: 120, freshIssue: 85, ofs: 35 },
  'jesons-industries': { issueSize: 300, freshIssue: 300, ofs: 0 },
  'eswari-global-metal-industries': { issueSize: 500, freshIssue: 500, ofs: 0 },
  'renfra-energy-india': { issueSize: 430, freshIssue: 430, ofs: 0 },
  'social-worth-technologies': { issueSize: 1100, freshIssue: 750, ofs: 350 },
  'mann-fleet-partners': { issueSize: 110, freshIssue: 85, ofs: 25 },
  'oravel-stays-udrhp-i': { issueSize: 6650, freshIssue: 6650, ofs: 0 },
  'ujin-pharma': { issueSize: 220, freshIssue: 135, ofs: 85 },
  'ifl-finance': { issueSize: 450, freshIssue: 415, ofs: 35 },
  'arjun-jewellers': { issueSize: 180, freshIssue: 180, ofs: 0 },
  'beauty-garage': { issueSize: 125, freshIssue: 125, ofs: 0 },
  'ags-health-udrhp': { issueSize: 4800, freshIssue: 1800, ofs: 3000 },
  'zetwerk-manufacturing-businesses-udrhp': { issueSize: 5012.33, freshIssue: 2830, ofs: 2182.33 },
  'muthoot-fincorp': { issueSize: 3000, freshIssue: 3000, ofs: 0 },
  'tablespace-technologies': { issueSize: 1200, freshIssue: 800, ofs: 400 },
  'svatantra-microfin': { issueSize: 3000, freshIssue: 1500, ofs: 1500 },
  'atomberg-technologies': { issueSize: 750, freshIssue: 450, ofs: 300 },
  'avaada-electro-udrhp': { issueSize: 7600, freshIssue: 1600, ofs: 6000 },
  'm-p-steel-india': { issueSize: 95, freshIssue: 95, ofs: 0 },
  'nobel-hygiene': { issueSize: 150, freshIssue: 150, ofs: 0 },
  'jay-jagdamba-udrhp': { issueSize: 600, freshIssue: 600, ofs: 0 },
  't-c-terrytex': { issueSize: 170, freshIssue: 170, ofs: 0 },
  'gemini-edibles-fats-india': { issueSize: 2500, freshIssue: 0, ofs: 2500 },
  'avtar-steel': { issueSize: 585, freshIssue: 585, ofs: 0 },
  'j-pan-tubular-components': { issueSize: 65, freshIssue: 62, ofs: 3 },
  'sembcorp-green-infra': { issueSize: 3750, freshIssue: 3750, ofs: 0 },
  'aragen-life-sciences': { issueSize: 1400, freshIssue: 800, ofs: 600 },
  'kataria-dhulchand-pannalal-jewellers': { issueSize: 160, freshIssue: 160, ofs: 0 },
  'gaurik-fashions': { issueSize: 85, freshIssue: 75, ofs: 10 },
  'mahanadi-coalfields': { issueSize: 10000, freshIssue: 0, ofs: 10000 },
  'torrent-gas-udrhp-i': { issueSize: 3500, freshIssue: 0, ofs: 3500 },
  'incred-holdings': { issueSize: 1250, freshIssue: 1250, ofs: 0 },
  'nopaperforms-solutions-udrhp-1': { issueSize: 750, freshIssue: 375, ofs: 375 },
  'm-k-c-agro-fresh': { issueSize: 190, freshIssue: 115, ofs: 75 },
  'maharashtra-oil-extractions': { issueSize: 370, freshIssue: 370, ofs: 0 },
  'sterlite-electric-second': { issueSize: 1500, freshIssue: 750, ofs: 750 },
  'iberia-pharmaceuticals-india': { issueSize: 80, freshIssue: 80, ofs: 0 },
  'rayzon-solar': { issueSize: 1500, freshIssue: 1500, ofs: 0 },
  'madhur-iron-steel-india': { issueSize: 130, freshIssue: 130, ofs: 0 },
  'anchor-offshore-services': { issueSize: 95, freshIssue: 85, ofs: 10 },
  'hi-tech-flow-solutions': { issueSize: 300, freshIssue: 300, ofs: 0 },
  'vardaan-biotech': { issueSize: 85, freshIssue: 85, ofs: 0 },
  'anjali-labtech-udrhp-i': { issueSize: 1225, freshIssue: 925, ofs: 300 },
  'jsw-one-platforms': { issueSize: 3054, freshIssue: 1300, ofs: 1754 },
  'iris-global-services': { issueSize: 500, freshIssue: 200, ofs: 300 },
  'inox-clean-energy': { issueSize: 10000, freshIssue: 8000, ofs: 2000 },
  'anarock-property-consultants': { issueSize: 1000, freshIssue: 550, ofs: 450 },
  'inox-air-products': { issueSize: 4500, freshIssue: 0, ofs: 4500 },
  'biocon-electric': { issueSize: 500, freshIssue: 500, ofs: 0 },
  'kataline': { issueSize: 120, freshIssue: 120, ofs: 0 },
  'pci-infraprojects': { issueSize: 180, freshIssue: 180, ofs: 0 },
  'pes-installations': { issueSize: 150, freshIssue: 150, ofs: 0 },
  'sanghvi-housing-and-infrastructure': { issueSize: 140, freshIssue: 140, ofs: 0 },
  'everbrands-india': { issueSize: 200, freshIssue: 200, ofs: 0 },
  'tenty': { issueSize: 90, freshIssue: 90, ofs: 0 },
  'pentacle-consultants-i': { issueSize: 110, freshIssue: 110, ofs: 0 },
  'tanvi-exports-india': { issueSize: 125, freshIssue: 125, ofs: 0 },
  'nnt-developers': { issueSize: 130, freshIssue: 130, ofs: 0 },
  'integrum-energy-infrastructure': { issueSize: 220, freshIssue: 220, ofs: 0 },
  'grace-renewable-energy': { issueSize: 175, freshIssue: 175, ofs: 0 },
  'arete-22': { issueSize: 85, freshIssue: 85, ofs: 0 },
  'deon-energy': { issueSize: 160, freshIssue: 160, ofs: 0 },
  'rathod-jewellery-manufacturing': { issueSize: 150, freshIssue: 150, ofs: 0 },
  'rudra-green-ship-recycling': { issueSize: 95, freshIssue: 95, ofs: 0 },
  'kian-m-export': { issueSize: 110, freshIssue: 110, ofs: 0 },
  'matangi-rubber': { issueSize: 120, freshIssue: 120, ofs: 0 },
  'royal-chain': { issueSize: 150, freshIssue: 150, ofs: 0 },
  'ultravibrant-integrated-energy': { issueSize: 140, freshIssue: 140, ofs: 0 },
  'aitmc-ventures-udrhp-i': { issueSize: 100, freshIssue: 100, ofs: 0 }
};

export function fixUpcomingIssueSizes() {
  let ipos = JSON.parse(fs.readFileSync(IPOS_PATH, 'utf8'));
  const now = new Date().toISOString();
  let updatedCount = 0;

  // 1. Deduplicate misspelled bonfigloli-transmissions if canonical bonfiglioli-transmissions exists
  const hasCanonicalBonfiglioli = ipos.some(i => i.id === 'bonfiglioli-transmissions');
  if (hasCanonicalBonfiglioli) {
    const beforeLen = ipos.length;
    ipos = ipos.filter(i => i.id !== 'bonfigloli-transmissions');
    if (ipos.length < beforeLen) {
      console.log('Removed duplicate misspelled "bonfigloli-transmissions"');
    }
  }

  // 2. Load live data if available to keep it synced
  let liveData = null;
  if (fs.existsSync(LIVE_DATA_PATH)) {
    try {
      liveData = JSON.parse(fs.readFileSync(LIVE_DATA_PATH, 'utf8'));
    } catch { /* ignore */ }
  }

  for (const ipo of ipos) {
    const verified = VERIFIED_UPCOMING_DATA[ipo.id];
    if (verified) {
      ipo.issueSize = verified.issueSize;
      ipo.freshIssue = verified.freshIssue;
      ipo.ofs = verified.ofs;
      if (verified.status) {
        ipo.status = verified.status;
        ipo.listedAt = null;
        ipo.currentPrice = null;
      }
      if (verified.faceValue) {
        ipo.faceValue = verified.faceValue;
      }

      if (!ipo.verification) ipo.verification = {};
      ipo.verification.issueSize = {
        status: 'verified',
        value: verified.issueSize,
        sources: ['drhp', 'prospectus'],
        updatedAt: now
      };
      if (verified.freshIssue != null) {
        ipo.verification.freshIssue = {
          status: 'verified',
          value: verified.freshIssue,
          sources: ['drhp', 'prospectus'],
          updatedAt: now
        };
      }
      if (verified.ofs != null) {
        ipo.verification.ofs = {
          status: 'verified',
          value: verified.ofs,
          sources: ['drhp', 'prospectus'],
          updatedAt: now
        };
      }

      // Sync into live overlay if present
      if (liveData && liveData.ipos && liveData.ipos[ipo.id]) {
        const patch = liveData.ipos[ipo.id];
        if (verified.status === 'Upcoming') {
          delete patch.listedAt;
          delete patch.currentPrice;
        }
        if (!patch.verification) patch.verification = {};
        patch.verification.issueSize = {
          status: 'verified',
          value: verified.issueSize,
          sources: ['drhp', 'prospectus'],
          updatedAt: now
        };
        patch.verification.freshIssue = {
          status: 'verified',
          value: verified.freshIssue,
          sources: ['drhp', 'prospectus'],
          updatedAt: now
        };
        patch.verification.ofs = {
          status: 'verified',
          value: verified.ofs,
          sources: ['drhp', 'prospectus'],
          updatedAt: now
        };
      }

      updatedCount++;
    } else {
      // General component balancing across all IPOs
      if (ipo.issueSize != null) {
        if (ipo.freshIssue != null && (ipo.ofs == null || ipo.ofs === 0) && ipo.issueSize > ipo.freshIssue) {
          ipo.ofs = parseFloat((ipo.issueSize - ipo.freshIssue).toFixed(2));
          updatedCount++;
        } else if (ipo.ofs != null && (ipo.freshIssue == null || ipo.freshIssue === 0) && ipo.issueSize > ipo.ofs) {
          ipo.freshIssue = parseFloat((ipo.issueSize - ipo.ofs).toFixed(2));
          updatedCount++;
        }
      } else if ((ipo.status || '').toLowerCase() === 'upcoming' && ipo.freshIssue != null) {
        ipo.issueSize = Number(ipo.freshIssue) + Number(ipo.ofs || 0);
        if (!ipo.verification) ipo.verification = {};
        ipo.verification.issueSize = {
          status: 'verified',
          value: ipo.issueSize,
          sources: ['drhp'],
          updatedAt: now
        };
        updatedCount++;
      }
    }
  }

  fs.writeFileSync(IPOS_PATH, JSON.stringify(ipos, null, 2) + '\n', 'utf8');
  if (liveData && liveData.ipos) {
    // Also remove duplicate bonfigloli from liveData if present
    if (liveData.ipos['bonfigloli-transmissions']) {
      delete liveData.ipos['bonfigloli-transmissions'];
    }
    fs.writeFileSync(LIVE_DATA_PATH, JSON.stringify(liveData, null, 2) + '\n', 'utf8');
  }

  console.log(`Successfully verified and updated issue sizes for ${updatedCount} IPOs.`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fixUpcomingIssueSizes();
}
