import { AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SupabaseWarning() {
  if (supabase) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4 rounded">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Supabase not configured.</strong> Please create a <code>.env</code> file with your Supabase credentials.
            See <code>SUPABASE_SETUP.md</code> for instructions.
          </p>
        </div>
      </div>
    </div>
  );
}



