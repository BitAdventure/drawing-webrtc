import React, { JSX, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { PICK_AVATAR } from "../../../constants/routes";

type PropsType = {
  children: JSX.Element;
};

const ProtectedUnauthorizedRoute: React.FC<PropsType> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    isAuth && id && navigate(`/${id}/${PICK_AVATAR}`);
    setLoading(false);
  }, [isAuth, navigate, id]);

  return !loading ? children : null;
};

export default ProtectedUnauthorizedRoute;
