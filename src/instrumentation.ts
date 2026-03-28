export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Log environment status for debugging
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.log('DIRECT_URL set:', !!process.env.DIRECT_URL);
  }
}
