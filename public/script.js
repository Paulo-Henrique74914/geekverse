function enviarEmail() {
  let email = document.querySelector("input[type='email']").value;

  if (email === "") {
    alert("Digite um email válido!");
  } else {
    alert("Email enviado com sucesso!");
  }
}