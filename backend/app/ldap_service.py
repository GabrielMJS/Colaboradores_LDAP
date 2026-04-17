"""
LDAP Service - Conexão e autenticação
"""

import os
from typing import Optional
from ldap3 import Server, Connection, ALL, SUBTREE
from ldap3.core.exceptions import LDAPException, LDAPBindError, LDAPSocketOpenError


class LDAPService:
    def __init__(self):
        self.host = os.getenv("LDAP_HOST", "ldap.aeb.gov.br")
        self.port = int(os.getenv("LDAP_PORT", "389"))
        self.bind_dn = os.getenv("LDAP_BIND_DN", "CN=Eventos Dev,OU=SERVICO,OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br")
        self.bind_password = os.getenv("LDAP_BIND_PASSWORD", "")
        self.base_dn = os.getenv("LDAP_BASE_DN", "OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br")

    # ------------------------------------------------------------------
    # Conexão interna (usuário de serviço)
    # ------------------------------------------------------------------

    def _get_service_connection(self) -> Connection:
        """Cria conexão autenticada com o usuário de serviço."""
        try:
            server = Server(self.host, port=self.port, get_info=ALL)
            conn = Connection(server, user=self.bind_dn, password=self.bind_password, auto_bind=True)
            return conn
        except LDAPSocketOpenError:
            raise Exception(f"Servidor LDAP inacessível: {self.host}:{self.port}")
        except LDAPBindError:
            raise Exception("Credenciais do usuário de serviço LDAP inválidas.")
        except LDAPException as e:
            raise Exception(f"Erro ao conectar no LDAP: {e}")

    # ------------------------------------------------------------------
    # Autenticação de usuário
    # ------------------------------------------------------------------

    def authenticate(self, user: str, password: str) -> bool:
        """
        Autentica usuário no LDAP.
        Busca o DN completo pelo sAMAccountName e tenta bind com a senha informada.
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
    # Busca de usuário
    # ------------------------------------------------------------------

    def search_user(self, user_id: str) -> Optional[dict]:
        """
        Busca informações do usuário pelo sAMAccountName (login de rede).
        Retorna dict com os atributos ou None se não encontrado.
        """
        conn = self._get_service_connection()
        try:
            search_filter = f"(sAMAccountName={user_id})"
            attributes = [
                "cn", "sAMAccountName", "mail", "displayName",
                "title", "department", "memberOf", "distinguishedName"
            ]
            conn.search(
                search_base=self.base_dn,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=attributes
            )

            if not conn.entries:
                return None

            entry = conn.entries[0]
            return self._parse_entry(entry)

        except LDAPException as e:
            raise Exception(f"Erro ao buscar usuário '{user_id}': {e}")
        finally:
            conn.unbind()

    # ------------------------------------------------------------------
    # Grupos do usuário
    # ------------------------------------------------------------------

    def get_user_groups(self, user_id: str) -> list[str]:
        """Obtém a lista de grupos (CNs) do usuário."""
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
    # Helper
    # ------------------------------------------------------------------

    def _parse_entry(self, entry) -> dict:
        """Converte entrada ldap3 para dict simples."""
        parsed = {"dn": entry.entry_dn}
        for attr in entry.entry_attributes:
            value = entry[attr].value
            parsed[attr] = value
        return parsed
