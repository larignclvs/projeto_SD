# Integrantes do grupo  
- Aléxia Suares  
- Gabrielle Mitie  
- Larissa Gonçalves  

## Detalhes do projeto  
### Linguagens usadas  
- Servidores: js
- Main e usuário: python
- Replicador de servidores: c

## Instruções de como executar  
- Subir os servidores usando o docker: docker-compose -f docker-compose-servidor.yml -p servidores up --build
- Rodar o arquivo [main.py](https://github.com/larignclvs/projeto_SD/blob/main/main.py)
- Escolher opção de criar usuário e depois de realizar postagem  
- Explorar outras opções do menu

## Opções do menu  
1. Criar novo usuário: cria novo usuário e insere no doc 'usuários.txt'
2. Fazer postagem: cria uma nova postagem no nome do usuário selecionado e insere no doc 'postagens.txt'
3. Seguir outro usuário: solicita o usuário a ser seguido e o usuário que quer seguir  
   ![image](https://github.com/user-attachments/assets/54026530-a960-490c-ba3f-577aa51f7232)
4. Mostrar log de um usuário: puxa todo o histórico, de postagens ou mensagens, de cada usuário
   ![image](https://github.com/user-attachments/assets/88c6dde6-3fe0-4b47-a19a-07c0000d1c0c)
5. Ver notificações: mostra as notificações do usuário
6. Resetar sistema: apaga todo o conteúdo do sistema - usuários cadastrados, mensagens, postagens
7. Enviar mensagem privada: envia mensagem privada para usuário x
8. Teste automatizado com 5 usuários: Realiza teste com 5 usuários realizando postagens e enviando mensagens simultaneamente para testar os 3 servidores e a replicação entre eles
9. Mostrar relógios: Mostra relógios dos servidores
10. Ajustar relógios dos servidores (aleatório): altera de maneira aleatória os relógios dos servidores - atrasando ou adiantando
11. Histórico: mostra histórico de algum dos servidores (1, 2 ou 3)
12. Sair: encerra o programa  



## Comandos do docker  
- Subir e buildar os containers: docker-compose -f docker-compose-servidor.yml up --build
- Derrubar servidor: docker compose -f docker-compose-servidor.yml stop servidor3  
- Subir o servidor: docker-compose -f docker-compose-servidor.yml start servidor3  

## Prints do projeto  
- **Teste** derrubando servidor - 5 usuários e 3 servidores  
![image](https://github.com/user-attachments/assets/c793cbf4-4054-4e5b-adad-729af7fa17e5)

![image](https://github.com/user-attachments/assets/a73fcb66-717c-4c5a-8007-7a175976cc22)  
![image](https://github.com/user-attachments/assets/35fa6bd1-5ec6-4c42-a7de-5fd7abc39fb5)  

Após subir novamente:  
![image](https://github.com/user-attachments/assets/878f0460-6af8-43b6-9c38-baa9c4fd31d4)



