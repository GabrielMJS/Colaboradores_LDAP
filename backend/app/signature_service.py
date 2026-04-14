"""
Signature Service - Geração de assinatura PNG
"""

class SignatureService:
    def generate_signature(self, user_name: str, user_title: str) -> bytes:
        """
        Gera uma assinatura em PNG baseada nos dados do usuário

        Args:
            user_name: Nome do usuário
            user_title: Cargo/título do usuário

        Returns:
            bytes: Imagem PNG da assinatura
        """
        pass

    def save_signature(self, signature_bytes: bytes, filename: str) -> str:
        """Salva a assinatura e retorna o caminho"""
        pass
