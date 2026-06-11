import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAuthenticated(): { isAuthenticated: boolean; loading: boolean } {
  const [state, setState] = useState<{ isAuthenticated: boolean; loading: boolean }>({
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({ isAuthenticated: !!data.session, loading: false });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ isAuthenticated: !!session, loading: false });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
