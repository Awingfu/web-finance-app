import React from "react";
import Head from "next/head";
import NavigationBar from "./NavigationBar";
import { prefix } from "../utils";

interface HeaderProps {
  titleName?: string;
}

const Header = (props: HeaderProps) => {
  const titleName = props.titleName;
  const titleSuffix = titleName ? "| " + titleName : "";
  const title = "Finance App " + titleSuffix;
  const content = "Adam Lui finance " + titleName;
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={content} />
        <link rel="icon" href={`${prefix}/favicon.ico`} />
      </Head>
      <NavigationBar />
    </>
  );
};

export default Header;
