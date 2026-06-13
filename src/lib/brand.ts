// Primary branded domain shown in all admin-facing copyable links.
// Never use the Lovable preview origin in shareable URLs.
export const PRIMARY_DOMAIN = "https://bansal.doctylia.com";

export const CBT_KIOSK_URL = `${PRIMARY_DOMAIN}/cbt`;

// Hidden control-panel entry. Not linked anywhere in the public UI.
// Share this URL only with super_admins.
export const SECRET_ADMIN_PATH = "/bansal-control-room-9F2K";
export const SECRET_ADMIN_URL = `${PRIMARY_DOMAIN}${SECRET_ADMIN_PATH}`;
