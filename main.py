from usuario import Usuario
import os
import time
import requests

usuarios = {}

# Lista de servidores de mensagens
SERVIDORES_MENSAGENS = [
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003"
]

# Carrega usuários salvos do arquivo
if os.path.exists("usuarios.txt"):
    with open("usuarios.txt", "r") as f:
        for linha in f:
            nome = linha.strip()
            if nome and nome not in usuarios:
                usuarios[nome] = Usuario(nome)

# Carrega seguidores salvos do arquivo
if os.path.exists("seguidores.txt"):
    with open("seguidores.txt", "r") as f:
        for linha in f:
            partes = linha.strip().split("::")
            if len(partes) == 2:
                seguidor_nome, seguido_nome = partes
                if seguidor_nome in usuarios and seguido_nome in usuarios:
                    seguidor = usuarios[seguidor_nome]
                    seguido = usuarios[seguido_nome]
                    if seguidor not in seguido.seguidores:
                        seguido.seguidores.append(seguidor)

def menu():
    print("\n--- MENU ---")
    print("1. Criar novo usuário")
    print("2. Fazer postagem")
    print("3. Seguir outro usuário")
    print("4. Mostrar log de um usuário")
    print("5. Ver notificações")
    print("6. Resetar sistema")
    print("7. Enviar Mensagem Privada")
    print("8. Sair")

def criar_usuario():
    nome = input("Nome do novo usuário: ").strip()
    if nome in usuarios:
        print("Usuário já existe.")
    else:
        usuarios[nome] = Usuario(nome)
        with open("usuarios.txt", "a") as f:
            f.write(nome + "\n")
        print(f"Usuário '{nome}' criado com sucesso!")

def fazer_postagem():
    nome = input("Nome do usuário: ").strip()
    if nome not in usuarios:
        print("Usuário não encontrado.")
        return
    texto = input("Digite o conteúdo da postagem: ").strip()
    usuarios[nome].postar(texto)
    print("Postagem feita com sucesso.")
    print("\nEnviando para todos os servidores de mensagens...")
    payload = {
        "nome": nome,
        "texto": texto,
        "timestamp": int(time.time() * 1000)
    }
    for servidor in SERVIDORES_MENSAGENS:
        try:
            response = requests.post(f"{servidor}/postar", json=payload)
            print(f"✅ [{servidor}] Resposta: {response.json()}")
        except Exception as e:
            print(f"❌ [{servidor}] Erro: {e}")

def enviar_msg():
    de = input("Remetente: ").strip()
    if de not in usuarios:
        print("Erro: Usuário remetente não cadastrado.")
        return
    para = input("Destinatário: ").strip()
    if para not in usuarios:
        print("Erro: Usuário destinatário não cadastrado.")
        return
    texto = input("Digite a mensagem: ").strip()
    payload = {
        "de": de,
        "para": para,
        "texto": texto,
        "timestamp": int(time.time() * 1000)
    }

    print("\nEnviando para todos os servidores de mensagens...")
    for servidor in SERVIDORES_MENSAGENS:
        try:
            response = requests.post(f"{servidor}/enviar", json=payload)
            print(f"✅ [{servidor}] Resposta: {response.json()}")
        except Exception as e:
            print(f"❌ [{servidor}] Erro: {e}")

def seguir_usuario():
    seguidor = input("Quem vai seguir? ").strip()
    seguido = input("Quem será seguido? ").strip()
    if seguidor not in usuarios or seguido not in usuarios:
        print("Um ou ambos os usuários não existem.")
        return
    if seguidor == seguido:
        print("Você não pode seguir a si mesmo.")
        return
    usuarios[seguidor].seguir(usuarios[seguido])
    print(f"{seguidor} agora segue {seguido}.")

def mostrar_log():
    nome = input("Nome do usuário: ").strip()
    try:
        with open("log.txt", "r") as f:
            logs = [linha for linha in f if f"[{nome}]" in linha]
        if logs:
            print("\n--- Log do usuário ---")
            for linha in logs:
                print(linha.strip())
        else:
            print("Nenhum log encontrado para esse usuário.")
    except FileNotFoundError:
        print("Arquivo de log ainda não existe.")

def ver_notificacoes():
    nome = input("Nome do usuário: ").strip()
    if nome not in usuarios:
        print("Usuário não encontrado.")
        return
    user = usuarios[nome]
    if user.notificacoes:
        print("\n--- Notificações ---")
        for notif in user.notificacoes:
            print(notif)
        user.notificacoes.clear()
    else:
        print("Sem notificações novas.")

def resetar_sistema():
    confirmacao = input("Tem certeza que deseja apagar todos os dados? (s/n): ").strip().lower()
    if confirmacao == "s":
        arquivos = ["usuarios.txt", "seguidores.txt", "postagens.txt", "log.txt"]
        for arquivo in arquivos:
            if os.path.exists(arquivo):
                with open(arquivo, "w") as f:
                    f.write("")  # Limpa o conteúdo
        usuarios.clear()  # Limpa os usuários em memória
        print("✅ Sistema reiniciado com sucesso.")
    else:
        print("❌ Cancelado.")

def main():
    while True:
        menu()
        escolha = input("Escolha uma opção: ").strip()
        if escolha == "1":
            criar_usuario()
        elif escolha == "2":
            fazer_postagem()
        elif escolha == "3":
            seguir_usuario()
        elif escolha == "4":
            mostrar_log()
        elif escolha == "5":
            ver_notificacoes()
        elif escolha == "6":
            resetar_sistema()
        elif escolha == "7":
            enviar_msg()
        elif escolha == "8":
            print("Saindo...")
            break
        else:
            print("Opção inválida.")

if __name__ == "__main__":
    main()
