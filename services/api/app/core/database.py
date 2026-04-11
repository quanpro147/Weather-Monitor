from supabase import Client, create_client

from .config import settings

_supabase: Client | None = None


def get_supabase() -> Client:
    """Return the Supabase client singleton (service-role key for server-side use)."""
    global _supabase
    if _supabase is None:
        print(f"[DEBUG] SUPABASE_URL: {settings.supabase_url}")
        print(f"[DEBUG] SUPABASE_SERVICE_ROLE_KEY (10 ký tự đầu): {settings.supabase_service_role_key[:10] if settings.supabase_service_role_key else 'None'}...")
        
        _supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase
