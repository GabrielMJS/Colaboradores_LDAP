"""
LDAP Service - Conexão, autenticação e busca de colaboradores
AEB - Agência Espacial Brasileira
"""

import os
import io
import base64
from typing import Optional
from ldap3 import Server, Connection, ALL, SUBTREE
from ldap3.core.exceptions import LDAPException, LDAPBindError, LDAPSocketOpenError
from PIL import Image, ImageOps


class LDAPService:
    def __init__(self):
        self.host          = os.getenv("LDAP_HOST", "ldap.aeb.gov.br")
        self.port          = int(os.getenv("LDAP_PORT", "389"))
        self.bind_dn       = os.getenv("LDAP_BIND_DN", "CN=Eventos Dev,OU=SERVICO,OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br")
        self.bind_password = os.getenv("LDAP_BIND_PASSWORD", "")
        self.base_dn       = os.getenv("LDAP_BASE_DN", "OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br")

        # Atributos buscados em TODAS as consultas
        self.atributos = [
            "cn",
            "sAMAccountName",
            "displayName",
            "title",           # Cargo
            "department",      # Lotação / Coordenação
            "ou",              # Unidade (sigla)
            "telephoneNumber", # Ramal
            "mail",            # E-mail
            "thumbnailPhoto",  # Foto (bytes)
            "jpegPhoto",       # Foto alternativa (bytes)
            "memberOf",        # Grupos
            "distinguishedName",
        ]

    # ------------------------------------------------------------------
    # Conexão interna (usuário de serviço)
    # ------------------------------------------------------------------

    def _get_service_connection(self) -> Connection:
        """Cria conexão autenticada com o usuário de serviço."""
        try:
            server = Server(self.host, port=self.port, get_info=ALL)
            conn = Connection(
                server,
                user=self.bind_dn,
                password=self.bind_password,
                auto_bind=True
            )
            return conn
        except LDAPSocketOpenError:
            raise Exception(f"Servidor LDAP inacessível: {self.host}:{self.port}")
        except LDAPBindError:
            raise Exception("Credenciais do usuário de serviço LDAP inválidas.")
        except LDAPException as e:
            raise Exception(f"Erro ao conectar no LDAP: {e}")

    # ------------------------------------------------------------------
    # Busca de todos os colaboradores (para a tabela principal)
    # ------------------------------------------------------------------

    def search_all_users(self, unidade: Optional[str] = None) -> list[dict]:
        """
        Retorna apenas usuários ATIVOS com e-mail cadastrado.
        Contas desativadas no AD (bit 2 do userAccountControl) são excluídas.
        Opcionalmente filtra por unidade (OU).
        """
        conn = self._get_service_connection()
        try:
            # Exclui contas desativadas verificando o bit 2 do userAccountControl
            filtro_ativo = "(!(userAccountControl:1.2.840.113556.1.4.803:=2))"

            if unidade:
                search_filter = f"(&(objectClass=user)(mail=*){filtro_ativo}(department={unidade}))"
            else:
                search_filter = f"(&(objectClass=user)(mail=*){filtro_ativo})"

            conn.search(
                search_base=self.base_dn,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=self.atributos,
            )

            return [self._parse_entry(entry) for entry in conn.entries]

        except LDAPException as e:
            raise Exception(f"Erro ao buscar colaboradores: {e}")
        finally:
            conn.unbind()

    # ------------------------------------------------------------------
    # Busca de usuário individual
    # ------------------------------------------------------------------

    def search_user(self, user_id: str) -> Optional[dict]:
        """
        Busca um usuário pelo sAMAccountName (login de rede).
        Retorna dict com os atributos ou None se não encontrado.
        """
        conn = self._get_service_connection()
        try:
            conn.search(
                search_base=self.base_dn,
                search_filter=f"(sAMAccountName={user_id})",
                search_scope=SUBTREE,
                attributes=self.atributos,
            )

            if not conn.entries:
                return None

            return self._parse_entry(conn.entries[0])

        except LDAPException as e:
            raise Exception(f"Erro ao buscar usuário '{user_id}': {e}")
        finally:
            conn.unbind()

    # ------------------------------------------------------------------
    # Autenticação de usuário
    # ------------------------------------------------------------------

    def authenticate(self, user: str, password: str) -> bool:
        """
        Autentica usuário no LDAP.
        Busca o DN completo pelo sAMAccountName e tenta bind com a senha.
        """
        user_info = self.search_user(user)
        if not user_info:
            return False

        user_dn = user_info.get("distinguishedName") or user_info.get("dn")
        if not user_dn:
            return False

        try:
            server = Server(self.host, port=self.port, get_info=ALL)
            conn = Connection(server, user=user_dn, password=password, auto_bind=True)
            conn.unbind()
            return True
        except LDAPBindError:
            return False
        except LDAPException:
            return False

    # ------------------------------------------------------------------
    # Grupos do usuário
    # ------------------------------------------------------------------

    def get_user_groups(self, user_id: str) -> list[str]:
        """Retorna lista de grupos (CNs) do usuário."""
        user_info = self.search_user(user_id)
        if not user_info:
            return []

        raw_groups = user_info.get("memberOf", [])
        if isinstance(raw_groups, str):
            raw_groups = [raw_groups]

        groups = []
        for group_dn in raw_groups:
            for part in group_dn.split(","):
                if part.strip().upper().startswith("CN="):
                    groups.append(part.strip()[3:])
                    break
        return groups

    # ------------------------------------------------------------------
    # Helper: converte entrada LDAP em dict serializável
    # ------------------------------------------------------------------

    def _parse_entry(self, entry) -> dict:
        """
        Converte entrada ldap3 para dict simples e seguro para JSON.
        Trata foto (bytes → base64) e valores multivalorados.
        """
        parsed = {"dn": entry.entry_dn}

        for attr in entry.entry_attributes:
            try:
                value = entry[attr].value

                # Foto: bytes → string base64 redimensionada
                if attr in ("thumbnailPhoto", "jpegPhoto"):
                    if value and isinstance(value, bytes):
                        # Se não tiver foto ainda, pega essa
                        if not parsed.get("foto"):
                            try:
                                img = Image.open(io.BytesIO(value))
                                if img.mode != 'RGB':
                                    img = img.convert('RGB')
                                # Redimensiona e corta para um quadrado de 256x256 mantendo aspecto
                                img = ImageOps.fit(img, (256, 256), Image.Resampling.LANCZOS)
                                buffer = io.BytesIO()
                                img.save(buffer, format="JPEG", quality=85)
                                resized_bytes = buffer.getvalue()
                                parsed["foto"] = "data:image/jpeg;base64," + base64.b64encode(resized_bytes).decode("utf-8")
                            except Exception as img_err:
                                print(f"Erro ao redimensionar imagem: {img_err}")
                                parsed["foto"] = "data:image/jpeg;base64," + base64.b64encode(value).decode("utf-8")
                    else:
                        if "foto" not in parsed:
                            parsed["foto"] = None
                    continue

                # Listas → junta com vírgula ou pega primeiro
                if isinstance(value, list):
                    parsed[attr] = ", ".join(str(v) for v in value) if value else ""
                else:
                    parsed[attr] = str(value) if value is not None else ""

            except Exception:
                parsed[attr] = ""

        # Garante que todos os campos esperados pelo frontend existam
        campos_esperados = {
            "displayName": "",
            "title":       "",
            "department":  "",
            "ou":          "",
            "telephoneNumber": "",
            "mail":        "",
            "foto":        None,
            "sAMAccountName": "",
            "distinguishedName": parsed.get("dn", ""),
        }
        for campo, default in campos_esperados.items():
            if campo not in parsed:
                parsed[campo] = default

        return parsed