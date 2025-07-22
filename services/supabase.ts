import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yyjfpjjguxaxpfrlasun.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amZwampndXhheHBmcmxhc3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjg2MDEsImV4cCI6MjA2ODYwNDYwMX0.0igduSdGcendXvg0DruqJIgP9rE3K48LSgU_BdoVVTI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
