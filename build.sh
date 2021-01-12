if ! command -v node &>/dev/null; then
    echo "NodeJS is not installed. Install it and run the script again"
    exit
fi
npm install