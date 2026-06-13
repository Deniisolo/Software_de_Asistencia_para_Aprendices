import { useState } from "react";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { LoginApi } from "../api/login.api";
import { loginInputSchema } from "../config/schemas/login.schema";

export type LoginField = "usemame" | "Contrasenia";
export type LoginFieldErrors = Partial<Record<LoginField, string>>;

function resolveHomePathByRole(rol?: string) {
  const normalizedRole = rol?.trim().toLowerCase();

  if (normalizedRole === "aprendiz") return "/home/aprendiz";
  if (normalizedRole === "instructor") return "/home/instructor/asistencia";
  if (normalizedRole === "administrador") return "/home/administrador";

  return "/";
}

export function useLogin() {
  const loginApi = new LoginApi();
  const router = useRouter();
  const [usemame, setUsemame] = useState("");
  const [Contrasenia, setContrasenia] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  const validateFields = (): LoginFieldErrors => {
    const result = loginInputSchema.safeParse({ usemame, Contrasenia });
    if (result.success) return {};

    const errors: LoginFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (
        (field === "usemame" || field === "Contrasenia") &&
        !errors[field]
      ) {
        errors[field] = issue.message;
      }
    }
    return errors;
  };

  const handleUsemameChange = (value: string) => {
    setUsemame(value);
    if (formSubmitted) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.usemame;
        return next;
      });
    }
  };

  const handleContraseniaChange = (value: string) => {
    setContrasenia(value);
    if (formSubmitted) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.Contrasenia;
        return next;
      });
    }
  };

  const submit = async () => {
    setFormSubmitted(true);
    setIsError(false);
    setMensaje("");

    const errors = validateFields();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstInvalid = document.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalid?.focus();
      return;
    }

    setLoading(true);
    setMensaje("Validando...");

    try {
      const data = await loginApi.login({ usemame, Contrasenia });

      if (!data.ok || !data.token) {
        setIsError(true);
        setMensaje(data.error ?? "No se pudo iniciar sesion");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      setMensaje(`Login exitoso. Rol: ${data.user?.rol ?? "N/A"}`);
      setLoading(false);
      router.push(resolveHomePathByRole(data.user?.rol));
    } catch (error) {
      if (error instanceof AxiosError) {
        const serverMessage =
          (error.response?.data as { error?: string } | undefined)?.error ??
          "No se pudo iniciar sesion";
        setIsError(true);
        setMensaje(serverMessage);
        setLoading(false);
        return;
      }

      setIsError(true);
      setMensaje("No se pudo iniciar sesion");
      setLoading(false);
    }
  };

  const showFieldError = (field: LoginField) =>
    formSubmitted ? fieldErrors[field] : undefined;

  return {
    usemame,
    Contrasenia,
    mensaje,
    loading,
    isError,
    formSubmitted,
    showFieldError,
    setUsemame: handleUsemameChange,
    setContrasenia: handleContraseniaChange,
    submit
  };
}
