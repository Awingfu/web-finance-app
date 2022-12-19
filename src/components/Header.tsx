import React from "react";
import Head from 'next/head';
import NavigationBar from './NavigationBar';
import { prefix } from '../utils';

interface HeaderProps {
    titleName?: string;
}

const Header = (props : HeaderProps) => {
    let titleName = props.titleName;
    let titleSuffix = titleName ? ("| " + titleName) : "";
    let metadataContent = "Adam Lui finance " + titleName;
    return (
        <>
            <Head>
                <title> Finance App {titleSuffix} </title>
                <meta name="description" content={metadataContent} />
                <link rel="icon" href={`${prefix}/favicon.ico`} />
            </Head>
            <NavigationBar/>
        </>
    );
};

export default Header;