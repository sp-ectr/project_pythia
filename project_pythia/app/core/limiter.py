import json
from urllib.parse import parse_qs
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


# Пробуем достать tg_id из заголовка X-TG-Data - если пусто откатываемся на IP
# Отдаем сырой Request slowapi до логики FastAPI
def get_tg_user_id(request: Request) -> str:
    init_data = request.headers.get("X-TG-Data")
    if init_data:
        try:
            parsed_data = {k: v[0] for k, v in parse_qs(init_data).items()}
            user_data = json.loads(parsed_data.get("user", "{}"))
            tg_id = user_data.get("id")
            if tg_id:
                return f"tg_{tg_id}"
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=get_tg_user_id)
