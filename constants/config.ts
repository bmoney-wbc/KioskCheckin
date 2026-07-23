// Kiosk configuration — change per clinic deployment
export const CLINIC_ID = 'Plano';
export const CLINIC_NAME = 'Whole Body Chiropractic';

// Local on-prem bridge (see C:\KioskBridge\kiosk-bridge on the clinic's server/workstation).
// Patient lookup and check-in go here directly over the clinic LAN — never through Supabase.
// Uses a self-signed cert; the iPad must have certs/kiosk-bridge.crt installed as trusted.
export const BRIDGE_URL = 'https://192.168.1.62:8443';

// Timing constants (milliseconds)
export const ERROR_AUTO_RETURN_DELAY = 5000;
export const ARRIVAL_ONLY_AUTO_RETURN_DELAY = 5000;
export const NONE_OF_THESE_AUTO_RETURN_DELAY = 3000;
export const IDLE_TIMEOUT_MS = 60000;
export const IDLE_MODAL_COUNTDOWN_SECONDS = 15;
