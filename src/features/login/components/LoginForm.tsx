"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { FiEye, FiEyeOff, FiLock, FiUser } from "react-icons/fi";
import { useLogin } from "../hooks/useLogin";
import styles from "./LoginForm.module.css";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={styles.fieldError} role="alert">
      {message}
    </p>
  );
}

export function LoginForm() {
  const [showPwd, setShowPwd] = useState(false);
  const {
    usemame,
    Contrasenia,
    mensaje,
    loading,
    isError,
    showFieldError,
    setUsemame,
    setContrasenia,
    submit
  } = useLogin();

  const usemameError = showFieldError("usemame");
  const contraseniaError = showFieldError("Contrasenia");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submit();
  };

  return (
    <section className={styles.wrapper}>
      <aside className={styles.hero}>
        <Image
          src="/login-illustration.png"
          alt="Ilustracion login"
          width={520}
          height={520}
          className={styles.heroImage}
          priority
        />
      </aside>

      <div className={styles.panel}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            Bienvenido a <span>SAA</span>
          </h1>

          <form onSubmit={onSubmit} className={styles.form} noValidate>
            <label className={styles.label} htmlFor="usemame">
              Usuario
            </label>
            <div className={styles.inputWrap}>
              <FiUser className={styles.iconLeft} />
              <input
                id="usemame"
                name="usemame"
                className={usemameError ? `${styles.input} ${styles.inputInvalid}` : styles.input}
                value={usemame}
                onChange={(event) => setUsemame(event.target.value)}
                placeholder="Ingresa tu usuario"
                aria-invalid={usemameError ? true : undefined}
                aria-describedby={usemameError ? "usemame-error" : undefined}
              />
            </div>
            <FieldError id="usemame-error" message={usemameError} />

            <label className={styles.label} htmlFor="Contrasenia">
              Contraseña
            </label>
            <div className={styles.inputWrap}>
              <FiLock className={styles.iconLeft} />
              <input
                id="Contrasenia"
                name="Contrasenia"
                className={
                  contraseniaError ? `${styles.input} ${styles.inputInvalid}` : styles.input
                }
                type={showPwd ? "text" : "password"}
                value={Contrasenia}
                onChange={(event) => setContrasenia(event.target.value)}
                placeholder="•••••••••••••••"
                aria-invalid={contraseniaError ? true : undefined}
                aria-describedby={contraseniaError ? "Contrasenia-error" : undefined}
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setShowPwd((value) => !value)}
                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPwd ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <FieldError id="Contrasenia-error" message={contraseniaError} />

            <div className={styles.forgotWrap}>
              <a href="#" className={styles.forgot}>
                ¿Has olvidado tu contraseña?
              </a>
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Validando..." : "Ingresar"}
            </button>
          </form>

          {mensaje ? (
            <p className={`${styles.message} ${isError ? styles.messageError : ""}`}>
              {mensaje}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
