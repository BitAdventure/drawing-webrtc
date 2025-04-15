import { JSX, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "@/hooks/useSelector";
import { LOGIN } from "@/constants/routes";
import useMountEffect from "@/hooks/useMountEffect";

type PropsType = {
  children: JSX.Element;
};

const ProtectedRoute: React.FC<PropsType> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const isAuth = useSelector((state) => state.auth.isAuth);
  const navigate = useNavigate();
  const { id } = useParams();

  useMountEffect(() => {
    if (!isAuth) {
      navigate(`/${id}/${LOGIN}${window.location.search}`);
    }
    setLoading(false);
  });

  return !loading ? children : null;
};

export default ProtectedRoute;
