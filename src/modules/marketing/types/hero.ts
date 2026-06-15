
export interface Tag {
    label: string;
    color: string;
}

export interface HeroContentData {
    badge: string;
    titleParts: string[];
    description: string;
    tags: Tag[];
    ctaPrimary: string;
    ctaSecondary: string;
    socialProof: {
        users: {
            initial: string;
            bg: string;
        }[];
        text: string;
        note: string;
    }

}
