import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pcotlnxnulosjgzjmwvb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb3RsbnhudWxvc2pnemptd3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDQxNTMsImV4cCI6MjA5NTcyMDE1M30.fZ_1gN_AyqOdxepfrGpe3sGwG2zsn06KL7ZKSmOWt1M'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
