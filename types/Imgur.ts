interface ImgurUploadResponse {
  data: {
    id: string,
    title: null,
    description: null,
    datetime: number,
    type: string,
    animated: boolean,
    width: number,
    height: number,
    size: number,
    views: number,
    bandwidth: number,
    vote: null,
    favorite: boolean,
    nsfw: null,
    section: null,
    account_url: null,
    account_id: number,
    is_ad: boolean,
    in_most_viral: boolean,
    tags: string[],
    ad_type: number,
    ad_url: string,
    in_gallery: boolean,
    deletehash: string,
    name: string,
    link: string,
  };
  success: boolean;
  status: number;
}

export default ImgurUploadResponse;
