// Helper to prefix image to be used with any URL upon deployment
const prefix = process.env.NEXT_PUBLIC_BASE_PATH || "";
export { prefix };
